const Pengajuan = require('../models/Pengajuan');
const Notification = require('../models/Notification');
const { s3Client } = require('../config/s3');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

// @desc    Create new pengajuan
// @route   POST /api/pengajuan
// @access  Private
const createPengajuan = async (req, res) => {
  try {
    const {
      user_id,      // String ID from frontend
      user_nik,
      user_nama,
      user_email,
      user_rayon,
      rayon,
      type,         // Frontend uses 'type' or 'tipe'
      tipe,
      form,
      meta,
      files, // Add files to destructuring
      status
    } = req.body;

    // Use provided values or defaults
    const finalType = type || tipe || 'lainnya';
    const finalRayon = rayon || user_rayon;
    const finalStatus = status || 'proses';
    const finalUserNama = user_nama || 'Jemaat';

    // Prepare files object for S3 upload
    let processedFiles = files || {};
    
    // Create clean processedForm WITHOUT file_sup1-4 (to avoid saving base64)
    let processedForm = {};
    if (form) {
      // Copy all fields EXCEPT file_sup1-4
      for (const key in form) {
        if (!key.match(/^file_sup[1-4]$/)) {
          processedForm[key] = form[key];
        }
      }
    }

    // Collect all upload promises for parallel execution
    const uploadPromises = [];
    const uploadResults = {}; // Store results from async uploads

    // Handle draft file upload to S3 (for surat lainnya file_utama)
    if (files && files.draft && files.draft.data) {
      const draftFile = files.draft;
      
      uploadPromises.push(
        (async () => {
          try {
            const base64Data = draftFile.data.replace(/^data:.+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            const fileKey = `drafts/${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${draftFile.name}`;
            
            const uploadCommand = new PutObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: fileKey,
              Body: buffer,
              ContentType: draftFile.mime || 'application/octet-stream'
            });
            
            await s3Client.send(uploadCommand);
            console.log(`✅ Draft file uploaded to S3: ${fileKey}`);
            
            processedFiles.draft = {
              key: fileKey,
              name: draftFile.name,
              mime: draftFile.mime,
              size: draftFile.size || buffer.length,
              uploaded_at: new Date(),
              uploaded_by: finalUserNama
            };
          } catch (error) {
            console.error('❌ Failed to upload draft file to S3:', error);
          }
        })()
      );
    }

    // Handle file_sup1-4 upload to S3 (for surat lainnya supporting docs) - PARALLEL
    if (form) {
      for (let i = 1; i <= 4; i++) {
        const fileKey = `file_sup${i}`;
        const fileData = form[fileKey];
        
        console.log(`🔍 Checking ${fileKey} for upload:`, {
          exists: !!fileData,
          hasData: !!(fileData && fileData.data),
          hasName: !!(fileData && fileData.name)
        });
        
        if (fileData && fileData.data && fileData.name) {
          const index = i; // Capture index for closure
          uploadPromises.push(
            (async () => {
              try {
                const base64Data = fileData.data.replace(/^data:.+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                const s3Key = `supporting/${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${fileData.name}`;
                
                const uploadCommand = new PutObjectCommand({
                  Bucket: process.env.S3_BUCKET_NAME,
                  Key: s3Key,
                  Body: buffer,
                  ContentType: fileData.mime || 'application/octet-stream'
                });
                
                await s3Client.send(uploadCommand);
                console.log(`✅ Supporting file ${index} uploaded to S3: ${s3Key}`);
                
                // Store result in uploadResults object (ONLY S3 metadata, NO base64)
                uploadResults[`file_sup${index}`] = {
                  key: s3Key,
                  name: fileData.name,
                  mime: fileData.mime,
                  size: fileData.size || buffer.length,
                  uploaded_at: new Date()
                };
              } catch (error) {
                console.error(`❌ Failed to upload file_sup${index} to S3:`, error);
              }
            })()
          );
        }
      }
    }

    // Wait for all uploads to complete in parallel
    if (uploadPromises.length > 0) {
      console.log(`⏳ Uploading ${uploadPromises.length} files to S3 in parallel...`);
      await Promise.all(uploadPromises);
      console.log(`✅ All ${uploadPromises.length} files uploaded successfully`);
      
      // Add ONLY uploaded files to processedForm (no base64 data)
      Object.assign(processedForm, uploadResults);
      
      console.log('📦 Uploaded files:', Object.keys(uploadResults));
      console.log('📦 Final processedForm keys:', Object.keys(processedForm));
    }

    const pengajuan = new Pengajuan({
      user_id: user_id || '',
      user_nik: user_nik || '',
      user_nama: finalUserNama,
      user_email: user_email || '',
      user_rayon: finalRayon,
      rayon: finalRayon,
      type: finalType,
      tipe: finalType,
      form: processedForm,
      meta: meta || {},
      files: processedFiles,
      status: finalStatus,
      timeline: [{
        at: new Date(),
        by: finalUserNama,
        action: 'submitted',
        note: 'Pengajuan dibuat'
      }]
    });

    const createdPengajuan = await pengajuan.save();
    
    // Generate pre-signed URLs for immediate display
    const responseObj = createdPengajuan.toObject();
    responseObj.id = responseObj._id.toString();
    
    // Generate pre-signed URL for draft file
    if (responseObj.files?.draft?.key) {
      try {
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: responseObj.files.draft.key,
          ResponseContentDisposition: `inline; filename="${responseObj.files.draft.name}"`
        });
        responseObj.draft_file_url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
      } catch (error) {
        console.error('Failed to generate draft URL:', error);
      }
    }
    
    // Generate pre-signed URLs for file_sup1-4
    if (responseObj.form) {
      const urlPromises = [];
      for (let i = 1; i <= 4; i++) {
        const fileKey = `file_sup${i}`;
        const fileData = responseObj.form[fileKey];
        
        if (fileData && fileData.key) {
          urlPromises.push(
            (async () => {
              try {
                const command = new GetObjectCommand({
                  Bucket: process.env.S3_BUCKET_NAME,
                  Key: fileData.key,
                  ResponseContentDisposition: `inline; filename="${fileData.name}"`
                });
                responseObj.form[`${fileKey}_url`] = await getSignedUrl(s3Client, command, { expiresIn: 900 });
              } catch (error) {
                console.error(`Failed to generate URL for ${fileKey}:`, error);
              }
            })()
          );
        }
      }
      await Promise.all(urlPromises);
    }
    
    // Create notification for Koordinator - DISABLED for efficiency (only jemaat gets notifications)
    // if (finalRayon) {
    //   await Notification.create({
    //     to_role: 'koordinator',
    //     type: 'surat_masuk',
    //     title: 'Pengajuan Baru',
    //     message: `Ada pengajuan surat baru dari rayon ${finalRayon}`,
    //     related_id: createdPengajuan._id
    //   });
    // }

    res.status(201).json(responseObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all pengajuan
// @route   GET /api/pengajuan
// @access  Private (Admin/Staff)
const getPengajuan = async (req, res) => {
  try {
    const { role, rayon, user_id, status, type } = req.query;
    let query = {};

    // Filter by user_id (for Jemaat) - SHOW ALL SURAT for this user
    if (user_id) {
      // Try multiple field variations to match user
      query.$or = [
        { user_id: user_id },
        { user_nik: user_id },
        { nik: user_id },
        { pemohon_nik: user_id }
      ];
      console.log('🔍 Backend - Searching for user_id:', user_id);
      // Don't apply status filter - show ALL status for jemaat
    }

    // Filter by rayon (for Koordinator)
    if (rayon && !user_id) {
      query.rayon = rayon;
    }

    // Filter by status (only if explicitly requested)
    if (status && !user_id) {
      query.status = status;
    }

    // Filter by type/tipe
    if (type) {
      query.type = type;
    }

    // Role-based filtering (if needed and not user_id query)
    if (!user_id) {
      if (role === 'koordinator' && rayon && !status) {
        // Koordinator sees submissions from their rayon (not yet fully processed)
        query.status = { $in: ['baru', 'submitted', 'diterima', 'verified_by_koordinator', 'ditolak', 'rejected_by_koor'] };
      } else if (role === 'tatausaha' && !status) {
        // TU sees verified submissions
        query.status = { $in: ['diterima', 'verified_by_koordinator', 'file_uploaded', 'disposisi_to_sekretaris', 'disposisi_to_pendeta', 'kembali', 'validated', 'archived'] };
      } else if (role === 'sekretaris' && !status) {
        query.status = { $in: ['disposisi_to_sekretaris', 'disposisi_to_pendeta', 'returned_by_sekretaris', 'validated_by_sekretaris'] };
      } else if (role === 'pendeta' && !status) {
        query.status = { $in: ['disposisi_to_pendeta', 'validated_by_pendeta', 'validated', 'returned_by_pendeta'] };
      }
    }

    console.log('🔍 Backend - Pengajuan Query:', JSON.stringify(query, null, 2));
    
    const pengajuanList = await Pengajuan.find(query).sort({ created_at: -1 });
    
    console.log('🔍 Backend - Found pengajuan count:', pengajuanList.length);
    if (pengajuanList.length > 0) {
      console.log('🔍 Backend - Sample data:', {
        user_id: pengajuanList[0].user_id,
        user_nik: pengajuanList[0].user_nik,
        nik: pengajuanList[0].nik,
        pemohon_nik: pengajuanList[0].pemohon_nik,
        status: pengajuanList[0].status,
        has_final_file_data: !!pengajuanList[0].final_file_data,
        has_final_file: !!pengajuanList[0].final_file,
        has_files_final: !!(pengajuanList[0].files && pengajuanList[0].files.final),
        has_final_file_url: !!pengajuanList[0].final_file_url
      });
    }
    
    // Transform _id to id for frontend compatibility
    // Also generate pre-signed URLs for files (for surat lainnya draft and supporting docs)
    const transformed = await Promise.all(pengajuanList.map(async (doc) => {
      const obj = doc.toObject();
      obj.id = obj._id.toString();
      
      // Generate pre-signed URL for draft file (file_utama for surat lainnya)
      if (obj.files?.draft?.key) {
        try {
          const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: obj.files.draft.key,
            ResponseContentDisposition: `inline; filename="${obj.files.draft.name}"`
          });
          obj.draft_file_url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
        } catch (error) {
          console.error('Failed to generate draft URL:', error);
        }
      }
      
      // Generate pre-signed URLs for file_sup1-4 (only for surat lainnya)
      const isSuratLainnya = (obj.type || obj.tipe || '').toLowerCase().includes('lainnya');
      if (isSuratLainnya && obj.form) {
        const urlPromises = [];
        for (let i = 1; i <= 4; i++) {
          const fileKey = `file_sup${i}`;
          const fileData = obj.form[fileKey];
          
          if (fileData && fileData.key) {
            urlPromises.push(
              (async () => {
                try {
                  const command = new GetObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: fileData.key,
                    ResponseContentDisposition: `inline; filename="${fileData.name}"`
                  });
                  obj.form[`${fileKey}_url`] = await getSignedUrl(s3Client, command, { expiresIn: 900 });
                } catch (error) {
                  console.error(`Failed to generate URL for ${fileKey}:`, error);
                }
              })()
            );
          }
        }
        await Promise.all(urlPromises);
      }
      
      return obj;
    }));
    
    res.json(transformed);
  } catch (error) {
    console.error('Error getting pengajuan:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pengajuan by ID
// @route   GET /api/pengajuan/:id
// @access  Private
const getPengajuanById = async (req, res) => {
  try {
    const pengajuan = await Pengajuan.findById(req.params.id);
    if (pengajuan) {
      const pengajuanObj = pengajuan.toObject();

      console.log('🔍 getPengajuanById - Raw data:', {
        type: pengajuanObj.type,
        has_files_draft: !!(pengajuanObj.files && pengajuanObj.files.draft),
        draft_key: pengajuanObj.files?.draft?.key,
        has_form: !!pengajuanObj.form,
        form_keys: pengajuanObj.form ? Object.keys(pengajuanObj.form) : [],
        file_sup1_in_form: pengajuanObj.form?.file_sup1,
        file_sup2_in_form: pengajuanObj.form?.file_sup2,
        file_sup3_in_form: pengajuanObj.form?.file_sup3,
        file_sup4_in_form: pengajuanObj.form?.file_sup4
      });

      // Generate pre-signed URL for draft file (file_utama for surat lainnya)
      if (pengajuanObj.files?.draft?.key) {
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: pengajuanObj.files.draft.key,
          ResponseContentDisposition: `inline; filename="${pengajuanObj.files.draft.name}"`
        });
        const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
        pengajuanObj.draft_file_url = url;
        console.log('✅ Generated draft_file_url');
      }

      // Generate pre-signed URLs for file_sup1-4 (supporting docs for surat lainnya)
      if (pengajuanObj.form) {
        for (let i = 1; i <= 4; i++) {
          const fileKey = `file_sup${i}`;
          const fileData = pengajuanObj.form[fileKey];
          
          console.log(`🔍 Checking ${fileKey}:`, fileData);
          
          if (fileData && fileData.key) {
            try {
              const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: fileData.key,
                ResponseContentDisposition: `inline; filename="${fileData.name}"`
              });
              const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
              pengajuanObj.form[`${fileKey}_url`] = url;
              console.log(`✅ Generated ${fileKey}_url:`, url.substring(0, 50) + '...');
            } catch (error) {
              console.error(`Failed to generate URL for ${fileKey}:`, error);
            }
          }
        }
      }

      // If a final file key exists, generate a pre-signed URL for download
      if (pengajuanObj.files?.final?.key) {
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: pengajuanObj.files.final.key,
          // Use inline to allow preview in browser
          ResponseContentDisposition: `inline; filename="${pengajuanObj.files.final.name}"`
        });

        // Generate a URL that expires in 15 minutes
        const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
        pengajuanObj.file_url = url; // This will be picked up by the toJSON virtual
      }

      res.json(pengajuanObj);
    } else {
      res.status(404).json({ message: 'Pengajuan not found' });
    }
  } catch (error) {
    console.error('Error in getPengajuanById:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update pengajuan (General update)
// @route   PUT /api/pengajuan/:id
// @access  Private
const updatePengajuan = async (req, res) => {
  try {
    const { status, timeline, final_file_data, final_file_name, final_file_type, final_file_size, ...otherUpdates } = req.body;
    const pengajuan = await Pengajuan.findById(req.params.id);

    if (pengajuan) {
      // Handle S3 file upload if file data is present
      if (final_file_data && final_file_name && final_file_type) {
        console.log('📁 Processing S3 file upload:', {
          name: final_file_name,
          type: final_file_type,
          size: final_file_size,
          data_length: final_file_data.length
        });

        // 1. Decode Base64 to buffer
        const fileBuffer = Buffer.from(final_file_data.split(',')[1], 'base64');

        // 2. Generate a unique key for the file
        const timestamp = Date.now();
        const randomSuffix = crypto.randomBytes(4).toString('hex');
        const fileExtension = final_file_name.split('.').pop();
        const safeFileName = final_file_name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileKey = `surat/${pengajuan.rayon || 'unknown-rayon'}/${pengajuan._id}_${timestamp}_${randomSuffix}_${safeFileName}`;

        // 3. Create PutObject command
        const command = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileKey,
          Body: fileBuffer,
          ContentType: final_file_type,
          ContentLength: fileBuffer.length,
        });

        // 4. Upload to S3
        await s3Client.send(command);
        console.log(`✅ File uploaded successfully to S3 with key: ${fileKey}`);

        // 5. Save file metadata (NOT data) to MongoDB
        pengajuan.files = pengajuan.files || {};
        pengajuan.files.final = {
          key: fileKey, // Store the S3 key
          name: final_file_name,
          mime: final_file_type,
          size: fileBuffer.length, // Use actual buffer length for accuracy
          uploaded_at: new Date(),
          uploaded_by: 'tatausaha', // Or get from authenticated user
        };
        
        // Ensure old data field is cleared
        pengajuan.files.final.data = undefined;

      } else if (final_file_data === null || final_file_name === null) {
        // Handle file removal if requested
        console.log('🗑️ Received request to remove final file.');
        // Note: Add logic here to delete from S3 if needed.
        pengajuan.files.final = {};
      }
      
      // Update other fields
      Object.assign(pengajuan, otherUpdates);

      if (status) {
        pengajuan.status = status;
      }

      if (timeline && Array.isArray(timeline)) {
        // Replace timeline with the provided array (frontend sends full history)
        pengajuan.timeline = timeline;
      }

      const updatedPengajuan = await pengajuan.save();
      
      console.log('💾 Pengajuan saved, returning data with file info:', {
        _id: updatedPengajuan._id,
        has_file_key: !!(updatedPengajuan.files?.final?.key),
        file_name: updatedPengajuan.files?.final?.name,
        file_key: updatedPengajuan.files?.final?.key
      });
      
      // Generate pre-signed URL for the response if file exists
      const responseObj = updatedPengajuan.toObject();
      if (responseObj.files?.final?.key) {
        try {
          const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: responseObj.files.final.key,
            ResponseContentDisposition: `inline; filename="${responseObj.files.final.name}"`
          });
          const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
          responseObj.file_url = url;
          console.log('✅ Generated pre-signed URL for response');
        } catch (urlError) {
          console.error('⚠️ Failed to generate pre-signed URL:', urlError);
        }
      }
      
      res.json(responseObj);
    } else {
      res.status(404).json({ message: 'Pengajuan not found' });
    }
  } catch (error) {
    console.error('❌ updatePengajuan error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Process Disposisi / Status Change
// @route   PUT /api/pengajuan/:id/status
// @access  Private
const updateStatus = async (req, res) => {
  try {
    const { status, by, note, to_role } = req.body;
    const pengajuan = await Pengajuan.findById(req.params.id);

    if (!pengajuan) {
      return res.status(404).json({ message: 'Pengajuan not found' });
    }

    const oldStatus = pengajuan.status;
    pengajuan.status = status;
    
    // AUTO-ASSIGN NOMOR URUT SURAT when Koordinator validates (accepts) the surat
    if ((status === 'diterima' || status === 'verified_by_koordinator') && !pengajuan.nomor_seq) {
      // Get next sequence number for current year
      const currentYear = new Date().getFullYear();
      
      // Count ALL pengajuan in current year that already have nomor_seq assigned
      // Use $or to check both created_at and nomor_assigned_at for year filtering
      const count = await Pengajuan.countDocuments({
        $or: [
          {
            created_at: {
              $gte: new Date(currentYear, 0, 1),
              $lte: new Date(currentYear, 11, 31, 23, 59, 59)
            }
          },
          {
            nomor_assigned_at: {
              $gte: new Date(currentYear, 0, 1),
              $lte: new Date(currentYear, 11, 31, 23, 59, 59)
            }
          }
        ],
        nomor_seq: { $exists: true, $ne: null, $gt: 0 }
      });
      
      const sequence = count + 1;
      pengajuan.nomor_seq = sequence;
      pengajuan.nomor_assigned_at = new Date();
      
      console.log(`🔢 Auto-assigned nomor urut surat: ${sequence} (tahun ${currentYear}) - Total existing: ${count}`);
    }
    
    // Add timeline entry
    pengajuan.timeline.push({
      at: new Date(),
      by: by || 'System',
      action: status,
      note: note || ''
    });

    // Handle specific logic like validation or archiving
    if (status === 'validated' || status === 'validated_by_pendeta') {
        pengajuan.validated_at = new Date();
        // Generate nomor surat if needed (logic can be added here or in a separate controller)
    }

    const updated = await pengajuan.save();

    // Create notification for jemaat when status changes to ditolak or validated
    if (status === 'ditolak' || status === 'rejected_by_koor') {
      await Notification.create({
        to_nik: pengajuan.user_nik,
        user_id: pengajuan.user_id,
        to_role: 'jemaat',
        type: 'surat_ditolak',
        title: 'Pengajuan Ditolak',
        judul: 'Pengajuan Ditolak',
        message: `Pengajuan surat ${pengajuan.type || 'Anda'} ditolak oleh Koordinator Rayon. ${note ? 'Catatan: ' + note : ''}`,
        pesan: `Pengajuan surat ${pengajuan.type || 'Anda'} ditolak oleh Koordinator Rayon. ${note ? 'Catatan: ' + note : ''}`,
        related_id: pengajuan._id,
        url: `pengajuan-detail.html?id=${pengajuan._id}`
      });
      console.log('📧 Notification created for jemaat (ditolak):', pengajuan.user_nik);
    } else if (status === 'validated' || status === 'validated_by_pendeta') {
      await Notification.create({
        to_nik: pengajuan.user_nik,
        user_id: pengajuan.user_id,
        to_role: 'jemaat',
        type: 'surat_masuk',
        title: 'Surat Selesai Diproses',
        judul: 'Surat Selesai Diproses',
        message: `Surat ${pengajuan.type || 'Anda'} telah selesai divalidasi dan siap diunduh.`,
        pesan: `Surat ${pengajuan.type || 'Anda'} telah selesai divalidasi dan siap diunduh.`,
        related_id: pengajuan._id,
        url: `surat-masuk.html`
      });
      console.log('📧 Notification created for jemaat (validated):', pengajuan.user_nik);
    }

    // PATCH: Always return pre-signed file_url if file exists
    const responseObj = updated.toObject();
    if (responseObj.files?.final?.key) {
      try {
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: responseObj.files.final.key,
          ResponseContentDisposition: `inline; filename="${responseObj.files.final.name}"`
        });
        const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
        responseObj.file_url = url;
      } catch (urlError) {
        console.error('⚠️ Failed to generate pre-signed URL:', urlError);
      }
    }
    res.json(responseObj);

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete pengajuan
// @route   DELETE /api/pengajuan/:id
// @access  Private
const deletePengajuan = async (req, res) => {
  try {
    const pengajuan = await Pengajuan.findById(req.params.id);
    if (pengajuan) {
      await pengajuan.deleteOne();
      res.json({ message: 'Pengajuan removed' });
    } else {
      res.status(404).json({ message: 'Pengajuan not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pre-signed file URL for a pengajuan (minimal payload)
// @route   GET /api/pengajuan/:id/file
// @access  Private (Sekretaris or owner/admin)
const getPengajuanFile = async (req, res) => {
  try {
    const pengajuan = await Pengajuan.findById(req.params.id);
    if (!pengajuan) return res.status(404).json({ message: 'Pengajuan not found' });

    // Basic role check: accept role=sekretaris or admin via query param for backward compat.
    // Also allow the owner if user_id is provided as query param (legacy flows).
    const role = (req.query.role || '').toLowerCase();
    const callerUserId = req.query.user_id || null;

    const isOwner = callerUserId && (String(callerUserId) === String(pengajuan.user_id) || String(callerUserId) === String(pengajuan.user_nik));
    // Allow sekretaris, tatausaha, admin, or the owner (legacy query-param based auth)
    if (!(role === 'sekretaris' || role === 'tatausaha' || role === 'admin' || isOwner)) {
      return res.status(403).json({ message: 'Access denied. Role sekretaris or tatausaha required.' });
    }

    // Try known locations for S3 key or existing URL
    const finalMeta = pengajuan.files?.final || {};
    const possibleKey = finalMeta.key || finalMeta.Key || finalMeta.path || finalMeta.s3_key || null;

    // If controller already has a populated file_url/final_file_url (legacy), return it
    if (pengajuan.file_url) return res.json({ file_url: pengajuan.file_url });
    if (pengajuan.final_file_url) return res.json({ file_url: pengajuan.final_file_url });

    if (possibleKey) {
      try {
        const filename = finalMeta.name || pengajuan.final_file_name || 'file';
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: possibleKey,
          ResponseContentDisposition: `inline; filename="${filename}"`
        });
        const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
        return res.json({ file_url: url });
      } catch (err) {
        console.error('Failed to presign S3 key:', possibleKey, err);
        return res.status(500).json({ message: 'Failed to generate pre-signed URL' });
      }
    }

    // Nothing we can use to presign or return
    console.warn('No usable final file key or URL found for pengajuan:', pengajuan._id);
    return res.status(404).json({ message: 'No final file available for this pengajuan' });
  } catch (error) {
    console.error('Error in getPengajuanFile:', error);
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get database storage statistics
// @route   GET /api/pengajuan/stats/storage
// @access  Private/Admin
const getStorageStats = async (req, res) => {
  try {
    const db = require('mongoose').connection.db;
    
    // Get database stats
    const dbStats = await db.stats();
    
    // Get collections info
    const pengajuanCount = await Pengajuan.countDocuments({});
    // Count all archived statuses (arsip, validated_by_pendeta, or has archived_at)
    const archivedCount = await Pengajuan.countDocuments({ 
      $or: [
        { status: 'arsip' },
        { status: 'validated_by_pendeta' },
        { status: 'validated' },
        { archived_at: { $exists: true, $ne: null } }
      ]
    });
    
    // Calculate storage used (in bytes)
    const storageUsed = dbStats.dataSize + dbStats.indexSize;
    const storageLimit = 500 * 1024 * 1024; // 500MB in bytes
    const storagePercent = ((storageUsed / storageLimit) * 100).toFixed(2);
    
    return res.json({
      storage: {
        used: storageUsed,
        limit: storageLimit,
        percent: parseFloat(storagePercent),
        usedMB: (storageUsed / (1024 * 1024)).toFixed(2),
        limitMB: 500,
        available: storageLimit - storageUsed,
        availableMB: ((storageLimit - storageUsed) / (1024 * 1024)).toFixed(2)
      },
      database: {
        name: db.databaseName,
        collections: dbStats.collections,
        objects: dbStats.objects,
        dataSize: dbStats.dataSize,
        indexSize: dbStats.indexSize
      },
      pengajuan: {
        total: pengajuanCount,
        archived: archivedCount,
        active: pengajuanCount - archivedCount
      }
    });
  } catch (error) {
    console.error('❌ Error getting storage stats:', error);
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Delete archived pengajuan (single or bulk)
// @route   DELETE /api/pengajuan/archives
// @access  Private/Admin
const deleteArchives = async (req, res) => {
  try {
    const { ids, deleteAll } = req.body;
    
    let result;
    let deletedIds = []; // Track IDs for notification deletion
    
    if (deleteAll === true) {
      // Get all archived pengajuan IDs first before deleting
      const archivedPengajuan = await Pengajuan.find({ 
        $or: [
          { status: 'arsip' },
          { status: 'validated_by_pendeta' },
          { status: 'validated' },
          { archived_at: { $exists: true, $ne: null } }
        ]
      }).select('_id');
      
      deletedIds = archivedPengajuan.map(p => p._id.toString());
      
      // Delete all archived pengajuan (includes all archived statuses)
      result = await Pengajuan.deleteMany({ 
        $or: [
          { status: 'arsip' },
          { status: 'validated_by_pendeta' },
          { status: 'validated' },
          { archived_at: { $exists: true, $ne: null } }
        ]
      });
      console.log(`✅ Deleted all ${result.deletedCount} archived pengajuan`);
      
      // Delete related notifications
      if (deletedIds.length > 0) {
        const notifResult = await Notification.deleteMany({
          pengajuan_id: { $in: deletedIds }
        });
        console.log(`✅ Deleted ${notifResult.deletedCount} related notifications`);
      }
      
      return res.json({
        message: `Berhasil menghapus ${result.deletedCount} arsip surat dan ${deletedIds.length} notifikasi terkait`,
        deletedCount: result.deletedCount,
        deletedNotifications: deletedIds.length
      });
    } else if (ids && Array.isArray(ids) && ids.length > 0) {
      // Delete specific archived pengajuan by IDs
      // Safety: only delete items that are actually archived
      result = await Pengajuan.deleteMany({ 
        _id: { $in: ids },
        $or: [
          { status: 'arsip' },
          { status: 'validated_by_pendeta' },
          { status: 'validated' },
          { archived_at: { $exists: true, $ne: null } }
        ]
      });
      console.log(`✅ Deleted ${result.deletedCount} archived pengajuan`);
      
      // Delete related notifications using the provided IDs
      if (ids.length > 0) {
        const notifResult = await Notification.deleteMany({
          pengajuan_id: { $in: ids.map(id => id.toString()) }
        });
        console.log(`✅ Deleted ${notifResult.deletedCount} related notifications`);
      }
      
      return res.json({
        message: `Berhasil menghapus ${result.deletedCount} arsip surat dan notifikasi terkait`,
        deletedCount: result.deletedCount,
        deletedNotifications: ids.length
      });
    } else {
      return res.status(400).json({ message: 'Parameter tidak valid. Gunakan ids array atau deleteAll boolean' });
    }
  } catch (error) {
    console.error('❌ Error deleting archives:', error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPengajuan,
  getPengajuan,
  getPengajuanById,
  updatePengajuan,
  updateStatus,
  deletePengajuan,
  getPengajuanFile,
  getStorageStats,
  deleteArchives
};

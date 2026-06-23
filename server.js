require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const path = require('path');

const app = express();

// ✅ FIXED CORS (ALLOW BOTH DEV + PROD SAFELY)
app.use(cors({
  origin: [
    "https://committeemanagement.netlify.app",
    "https://committeemanagement-production.netlify.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Notification helpers
// =========================
function sendNotification(userId, message) {
    const sql = "INSERT INTO notifications (user_id, message) VALUES (?, ?)";
    db.query(sql, [userId, message], (err) => {
        if (err) console.error('Notification error:', err);
    });
}

function sendAdminNotification(message) {
    const sql = "INSERT INTO notifications (user_id, message) VALUES (NULL, ?)";
    db.query(sql, [message], (err) => {
        if (err) console.error('Admin notification error:', err);
    });
}

// TEST
app.get('/', (req, res) => {
  res.send('Backend running');
});


// =========================
// AUTH (REGISTER / LOGIN)
// =========================

// REGISTER
app.post('/api/register', (req, res) => {
  const { name, email, password, department, phone } = req.body;

db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
    if (result.length > 0) {
      return res.json({ success: false, message: 'Email already exists' });
    }

  const sql = `
    INSERT INTO users (name, email, password, role, department, phone)
    VALUES (?, ?, ?, 'user', ?, ?)
  `;

  db.query(sql, [name, email, password, department, phone], (err) => {
    if (err) return res.json({ success: false, message: 'Email already exists' });
    res.json({ success: true, message: 'Register successful' });
  });
});
});

// LOGIN
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';

  db.query(sql, [email, password], (err, result) => {
    if (result.length > 0) {
      res.json({ success: true, user: result[0] });
    } else {
      res.json({ success: false, message: 'Invalid login' });
    }
  });
});


// =========================
// USERS
// =========================

// GET USERS (for admin dropdown)
// Fetch users for admin page
app.get('/api/users', (req, res) => {
  const sql = `
    SELECT 
      (@row := @row + 1) AS id,
      name,
      email,
      department,
      phone
    FROM users, (SELECT @row := 0) AS r
    WHERE role = 'user'
    ORDER BY name ASC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json(results);
  });
});


// =========================
// PROFILE
// =========================

app.get('/api/user/:id/profile', (req, res) => {
  db.query('SELECT * FROM users WHERE id = ?', [req.params.id], (err, result) => {
    if (err || result.length === 0) return res.json(null);
    res.json(result[0]);
  });
});

app.put('/api/user/:id/profile', (req, res) => {
  const { name, department, phone } = req.body;

  const sql = `
    UPDATE users SET name = ?, department = ?, phone = ?
    WHERE id = ?
  `;

  db.query(sql, [name, department, phone, req.params.id], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});


// =========================
// COMMITTEES
// =========================

// GET committees
app.get('/api/committees', (req, res) => {
  const sql = `
    SELECT DISTINCT committee_name, faculty, id
    FROM committees
    ORDER BY committee_name
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.json([]);
    }
    res.json(result);
  });
});

// ADD committee
app.post('/api/committees', (req, res) => {
  const { committee_name, faculty } = req.body;

  // Check if the committee already exists
  const checkSql = 'SELECT * FROM committees WHERE committee_name = ?';
  db.query(checkSql, [committee_name], (err, checkResult) => {
    if (err) {
      console.log(err);
      return res.json({ success: false, message: 'Query error' });
    }

    if (checkResult.length > 0) {
      return res.json({ success: false, message: 'Committee already exists' });
    }

    // Insert if not exists
    const sql = `INSERT INTO committees (committee_name, faculty) VALUES (?, ?)`;
    db.query(sql, [committee_name, faculty], (err) => {
      if (err) {
        console.log(err);
        return res.json({ success: false, message: 'Insert failed' });
      }
      res.json({ success: true, message: 'Committee added' });
    });
  });
});

// Update committee
app.put('/api/committees', (req, res) => {
  const { id, committee_name, faculty } = req.body;
  const sql = `UPDATE committees SET committee_name = ?, faculty = ? WHERE id = ?`;
  db.query(sql, [committee_name, faculty, id], (err) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
});

// Delete committee
app.delete('/api/committees/:id', (req, res) => {
  const id = req.params.id;
  const sql = `DELETE FROM committees WHERE id = ?`;
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
});


// =========================
// APPOINTMENTS
// =========================

// GET user appointments (Flutter)
app.get('/api/user/:id/appointments', (req, res) => {
  const userId = req.params.id;

  const sql = `
    SELECT appointments.id, committees.committee_name, appointments.role,
    appointments.start_date, appointments.end_date, appointments.status
    FROM appointments
    JOIN committees ON appointments.committee_id = committees.id
    WHERE appointments.user_id = ?
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.json([]);
    res.json(result);
  });
});

// ASSIGN appointment (admin)
app.post('/api/appointments', (req, res) => {
  const { user_id, committee_id, role, start_date, end_date, status } = req.body;

  const sql = `
    INSERT INTO appointments 
    (user_id, committee_id, role, start_date, end_date, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [user_id, committee_id, role, start_date, end_date, status], (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ success: false, message: 'Assignment failed' });
    }

    // Send notification to the user
    const message = `Anda telah dilantik sebagai ${role} ${committee_name} dari ${start_date} hingga ${end_date}`;
    const notifySql = 'INSERT INTO notifications (user_id, message) VALUES (?, ?)';
    db.query(notifySql, [user_id, message], (notifyErr) => {
      if (notifyErr) console.error('Failed to send notification:', notifyErr);
    });

    res.json({ success: true, message: 'Appointment assigned successfully' });
  });
});

app.put('/api/notifications/:id/read', (req, res) => {
  const notificationId = req.params.id;
  const sql = 'UPDATE notifications SET is_read = 1 WHERE id = ?';
  db.query(sql, [notificationId], (err) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
});


// =========================
// RECOMMENDATION (RANKING)
// =========================
app.get('/api/recommendations', (req, res) => {
  const sql = `
    SELECT 
  u.id,
  u.name,
  COUNT(CASE WHEN a.id IS NOT NULL AND c.id IS NOT NULL THEN 1 END) AS total_committees
FROM users u
LEFT JOIN appointments a
  ON u.id = a.user_id
  AND a.status = 'Active'
LEFT JOIN committees c
  ON a.committee_id = c.id
WHERE u.role = 'user'
GROUP BY u.id, u.name
ORDER BY total_committees ASC;
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.json([]);
    }

    const ranked = result.map((user, index) => {
      const committeesCount = user.total_committees || 0;

      let workloadScore = '';
      if (committeesCount === 0) workloadScore = 'Low';
      else if (committeesCount >= 1 && committeesCount <= 3) workloadScore = 'Medium';
      else workloadScore = 'High';

      return {
        ...user,
        recommendation_rank: index + 1,
        total_committees: committeesCount,
        workload_score: workloadScore
      };
    });

    res.json(ranked);
  });
});


// =========================
// EXPORT REPORT
// =========================

app.get('/api/report/appointments', (req, res) => {
  const { name, committee } = req.query;

  let sql = `
    SELECT 
      users.name,
      users.email,
      committees.committee_name,
      appointments.role,
      appointments.start_date,
      appointments.end_date,
      appointments.status
    FROM appointments
    JOIN users ON appointments.user_id = users.id
    JOIN committees ON appointments.committee_id = committees.id
  `;

  const conditions = [];
  const params = [];

  if (name) {
    conditions.push('users.name LIKE ?');
    params.push(`%${name}%`);
  }

  if (committee) {
    conditions.push('committees.committee_name LIKE ?');
    params.push(`%${committee}%`);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY appointments.start_date DESC';

  db.query(sql, params, (err, result) => {
    if (err) {
      console.log(err);
      return res.json([]);
    }
    res.json(result);
  });
});

// =========================
// PDF LETTER DOWNLOAD (PDFKit)
// =========================
app.get('/api/user/:id/letter/pdf', (req, res) => {
  const userId = req.params.id;

  // Fetch all active appointments for this user
  const sql = `
    SELECT users.name, users.department,
           appointments.role, appointments.start_date, appointments.end_date,
           committees.committee_name
    FROM users
    LEFT JOIN appointments 
      ON users.id = appointments.user_id AND appointments.status='Active'
    LEFT JOIN committees 
      ON appointments.committee_id = committees.id
    WHERE users.id = ?
    ORDER BY appointments.start_date ASC
  `;

  db.query(sql, [userId], (err, result) => {
    if (err || result.length === 0) {
      return res.status(404).send('No appointment found');
    }

    const data = result[0]; // Main user info

    const pdfFilePath = path.join(__dirname, 'public', `letter_${userId}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const writeStream = fs.createWriteStream(pdfFilePath);
    doc.pipe(writeStream);
    doc.pipe(res);

    // UiTM Letterhead
    doc.image(path.join(__dirname, 'public', 'img', 'LogoUiTM.png'), 50, 40, { width: 120 });
    doc.font('Times-Bold').fontSize(14).text('UNIVERSITI TEKNOLOGI MARA', 50, 40, { align: 'center' });
    doc.moveDown(2);

    // Header information (Surat Kami / Tarikh)
    doc.font('Times-Roman').fontSize(12);
    doc.text(`Surat Kami      : 500-KPPIM (PT.XX/XX)`, { continued: true }).text(`    Tarikh       : ${new Date().toLocaleDateString('en-GB')}`);
    doc.moveDown(2);

    // Recipient info
    doc.text(`${data.name}`);
    doc.text(`Pusat Pengajian Sains Pengkomputeran`);
    doc.text(`Kolej Pengajian Pengkomputeran, Informatik dan Media`);
    doc.text(`UiTM Shah Alam`);
    doc.moveDown(2);

    // Subject
    // Assign main role from first appointment
const assignedRole = result[0].role || 'KOMITI';
const assignedFaculty = result[0].faculty || '-';
const start = new Date(result[0].start_date).toLocaleDateString('en-GB');
const end = new Date(result[0].end_date).toLocaleDateString('en-GB');

// Header
doc.text(`Tuan/Puan`);
doc.moveDown(1);
doc.font('Times-Bold')
   .text(`PELANTIKAN SEBAGAI ${assignedRole.toUpperCase()} PUSAT PENGAJIAN SAINS PENGKOMPUTERAN, FAKULTI SAINS KOMPUTER DAN MATEMATIK`);
doc.moveDown(1);

// Body
const firstApptStart = new Date(result[0].start_date).toLocaleDateString('en-GB');

doc.moveDown(1);
doc.font('Times-Roman')
   .text(`Dengan segala hormatnya perkara di atas adalah dirujuk.\n`);
doc.moveDown(1);
doc.text(`2. Sukacita dimaklumkan bahawa tuan/puan dilantik sebagai ${assignedRole} ${result[0].committee_name} Peringkat Pusat Pengajian Sains Pengkomputeran, Fakulti Sains Komputer dan Matematik berkuatkuasa pada ${firstApptStart} dengan syarat-syarat seperti berikut:-`);
doc.moveDown(1);
doc.text(`i. Tempoh pelantikan ialah mulai (${start} hingga ${end})`);
doc.moveDown(1);
doc.text(`ii. Pelantikan ini adalah tidak beralaun`);
doc.moveDown(1);
doc.text(`iii. En./Puan juga berhak menarik balik pelantikan ini dengan memberi notis tiga puluh (30) hari sebelum pelantikan ini berakhir.`);
doc.moveDown(1);
doc.text(`iv. Pihak Universiti Teknologi MARA boleh melantik tuan/puan semula untuk memegang jawatan ini setelah tamat tempoh di atas.`);
doc.moveDown(1);
doc.text(`3. Pihak universiti berharap tuan/puan akan dapat menerima pelantikan ini dan seterusnya menerima tanggungjawab yang diamanahkan demi kepentingan dan kemajuan Universiti Teknologi MARA.`);
doc.moveDown(1);
doc.text(`4. Untuk tujuan rekod, sila kembalikan borang pengesahan penerimaan pelantikan selewat-lewatnya dalam tempoh 14 hari daripada tarikh surat ini dikeluarkan.`);
doc.moveDown(1);
doc.text(`Sekian, terima kasih`);
doc.moveDown(3);
doc.font('Times-Bold').fontSize(12).text('"MALAYSIA MADANI"');
doc.font('Times-Bold').fontSize(12).text('"BERKHIDMAT UNTUK NEGARA');
doc.moveDown(2);
doc.font('Times-Roman').fontSize(12);
doc.text(`Saya yang menjalankan amanah,`);
doc.moveDown(2); 
doc.text('(Signature here)'); 
doc.font('Times-Bold').fontSize(12).text('PROF. Ts DR. HARYANI HARON');
doc.font('Times-Roman').fontSize(12);
doc.text('Penolong Naib Canselor');
doc.moveDown(2);   
doc.text('s.k         1. Dekan (Akademik dan Antarabangsa), FSKM \n             2. Ketua Pengajian Sains Pengkomputeran, FSKM');

doc.end();

    writeStream.on('finish', () => {
      res.download(pdfFilePath);
    });

    writeStream.on('error', (err) => {
      console.error(err);
      res.status(500).send('PDF generation failed');
    });
  });
});

const ONE_DAY = 24 * 60 * 60 * 1000;

function checkExpiringAppointments() {
    const sql = `
        SELECT user_id, role, committee_name, end_date
        FROM appointments
        WHERE DATEDIFF(end_date, CURDATE()) <= 30
          AND status='Active'
    `;
    db.query(sql, (err, results) => {
        if (err) return console.error(err);
        results.forEach(appt => {
            // Notify user
            sendNotification(appt.user_id, `Perhatian: Pelantikan anda sebagai ${appt.role} di ${appt.committee_name} akan tamat pada ${appt.end_date}`);
            // Notify admin
            sendAdminNotification(`Pelantikan ${appt.user_id} sebagai ${appt.role} di ${appt.committee_name} akan tamat pada ${appt.end_date}`);
        });
    });
}

// Check once a day
setInterval(checkExpiringAppointments, ONE_DAY);

// Get notifications for user or admin
app.get('/api/notifications/:userId', (req, res) => {
    const { userId } = req.params;

    let sql = "SELECT * FROM notifications WHERE ";
    const params = [];

    if (userId === 'admin') {
        sql += "user_id IS NULL";
    } else {
        sql += "user_id = ?";
        params.push(userId);
    }

    sql += " ORDER BY created_at DESC";

    db.query(sql, params, (err, results) => {
        if (err) return res.json([]);
        res.json(results);
    });
});

// APPOINTMENT LETTER TEXT
app.get('/api/user/:id/letter', (req, res) => {
  const userId = req.params.id;

  const sql = `
    SELECT users.name, committees.committee_name, appointments.role,
    appointments.start_date, appointments.end_date
    FROM appointments
    JOIN users ON appointments.user_id = users.id
    JOIN committees ON appointments.committee_id = committees.id
    WHERE users.id = ? AND appointments.status = 'Active'
    ORDER BY appointments.start_date DESC
    LIMIT 1
  `;

  db.query(sql, [userId], (err, result) => {
    if (err || result.length === 0) {
      return res.json({
        success: false,
        message: 'No appointment letter available'
      });
    }

    const data = result[0];

    function formatDate(date) {
      return new Date(date).toLocaleDateString('en-GB');
    }

    res.json({
      success: true,
      letter: `Dear ${data.name},

You are appointed as ${data.role} for the ${data.committee_name} committee.

Appointment Period: ${data.start_date} until ${data.end_date}

Thank you for your commitment.

Signed,
Dean of Faculty`
    });
  });
});


//CERTIFICATE//
// Certificate PDF endpoint
app.get('/api/user/:id/certificate/pdf', (req, res) => {
  const userId = req.params.id;

  const sql = `
    SELECT users.name, appointments.role, committees.committee_name
    FROM appointments
    JOIN users ON appointments.user_id = users.id
    JOIN committees ON appointments.committee_id = committees.id
    WHERE users.id = ? AND appointments.status = 'Active'
    ORDER BY appointments.start_date DESC
    LIMIT 1
  `;

  db.query(sql, [userId], (err, result) => {
    if (err || result.length === 0) return res.status(404).send('No appointment found');

    const data = result[0];

    const pdfFilePath = path.join(__dirname, 'public', `certificate_${userId}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const writeStream = fs.createWriteStream(pdfFilePath);
    doc.pipe(writeStream);

    // Background
    doc.image(path.join(__dirname, 'public', 'img', 'certificate.jpg'), 0, 0, { width: doc.page.width, height: doc.page.height });

    // UiTM logo
    doc.image(path.join(__dirname, 'public', 'img', 'LogoUiTM.png'), doc.page.width/2 - 60, 50, { width: 120 });

    // Text content
    doc.font('Times-Bold').fontSize(28).text('Certificate of Appointment', 0, 180, { align: 'center' });
    doc.font('Times-Roman').fontSize(18).text('This certificate is proudly presented to', { align: 'center', lineGap: 10 });
    doc.font('Times-Bold').fontSize(24).text(data.name, { align: 'center', lineGap: 10 });
    doc.font('Times-Roman').fontSize(20).text(`For serving as ${data.role} in ${data.committee_name}`, { align: 'center', lineGap: 10 });
    doc.font('Times-Roman').fontSize(16).text('Signed, Dean of Faculty', 0, 600, { align: 'center' });

    doc.end();

    writeStream.on('finish', () => {
      res.download(pdfFilePath);
    });

    writeStream.on('error', (err) => {
      console.error(err);
      res.status(500).send('PDF generation failed');
    });
  });
});

// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
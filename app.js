require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const Service = require('./models/Service'); // Make sure this model exists

const app = express();

// Set view engine & static folder
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session config
app.use(session({
  secret: 'my-secret',
  resave: false,
  saveUninitialized: true,
}));

// Multer setup for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Auth middleware
function checkAuth(req, res, next) {
  if (req.session && req.session.admin) return next();
  else return res.redirect('/login');
}

// Static pages
app.get('/', (req, res) => res.render('index', { session: req.session }));
app.get('/about', (req, res) => res.render('about'));
app.get('/description', (req, res) => res.render('description'));
app.get('/contact', (req, res) => res.render('contact'));
app.get('/gallery', (req, res) => res.render('gallery'));

// 🔥 ONLY ONE service route (no duplicates)
app.get('/service', async (req, res) => {
  try {
    const services = await Service.find();
    const grouped = {};
    services.forEach(s => {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    });
    res.render('service', { session: req.session, groupedServices: grouped });
  } catch (err) {
    console.error(err);
    res.render('service', { session: req.session, groupedServices: {} });
  }
});



// Login
app.get('/login', (req, res) => res.render('login'));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    res.redirect('/admin/dashboard');
  } else {
    res.send('Invalid credentials');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Admin Dashboard
app.get('/admin/dashboard', checkAuth, async (req, res) => {
  try {
    const services = await Service.find();
    const grouped = {};

    services.forEach(service => {
      if (!grouped[service.category]) grouped[service.category] = [];
      grouped[service.category].push(service);
    });

    res.render('dashboard', { groupedServices: grouped });
  } catch (err) {
    res.status(500).send('Error loading dashboard');
  }
});


app.post('/admin/add', checkAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, category } = req.body;
    const imagePath = '/uploads/' + req.file.filename;

    const newService = new Service({ title, category, image: imagePath });
    await newService.save();

    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to add service');
  }
});

app.get('/admin/edit/:id', checkAuth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    res.render('edit-service', { service });
  } catch (err) {
    res.status(500).send('Error loading service');
  }
});

app.post('/admin/edit/:id', checkAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, category } = req.body;
    const updateData = { title, category };

    if (req.file) {
      updateData.image = '/uploads/' + req.file.filename;
    }

    await Service.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating service');
  }
});

app.get('/admin/delete/:id', checkAuth, async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.redirect('/admin/dashboard');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

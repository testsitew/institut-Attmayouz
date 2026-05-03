const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

const DATA_FILE = './data.json';

// Charger ou init data
let data = {
  programmes: [
    {
      id: 'sciences-islamiques',
      nom: 'Sciences islamiques',
      matieres: ['Arabe', 'Coran', 'Tarbia islamique', 'Nourania'],
      description: '',
      tarif: 0
    },
    {
      id: 'soutien-scolaire',
      nom: 'Soutien scolaire & calcul mental',
      matieres: ['Toutes les matières', 'Tous les niveaux', 'Calcul mental (Sourouban)'],
      description: '',
      tarif: 0
    },
    {
      id: 'langues-dialectes',
      nom: 'Langues & dialectes',
      matieres: ['Français', 'Anglais', 'Dialectes arabes', 'Langues africaines'],
      description: '',
      tarif: 0
    },
    {
      id: 'orthophonie-ergotherapie',
      nom: 'Orthophonie & Ergothérapie',
      matieres: ['Accompagnement personnalisé', 'En ligne', 'Pour enfants & adultes'],
      description: '',
      tarif: 0
    },
    {
      id: 'formations-pro',
      nom: 'Formations professionnelles',
      matieres: ['Hijama pour femmes', 'Coach Sourouban', 'Nour Al Bayan', 'Et plus encore...'],
      description: '',
      tarif: 0
    }
  ],
  inscriptions: [],
  whatsapp: '212612345678',
  logo: ''
};

if (fs.existsSync(DATA_FILE)) {
  const raw = fs.readFileSync(DATA_FILE);
  Object.assign(data, JSON.parse(raw));
} else {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Middleware
app.use(express.static('./public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'cle_secrete_admin_attamayouz',
  resave: false,
  saveUninitialized: false
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Multer config pour logo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './public/uploads/'),
  filename: (req, file, cb) => cb(null, 'logo' + path.extname(file.originalname))
});
const upload = multer({ storage });

// Identifiants admin (mot de passe hashé)
const ADMIN_USER = 'admin';
const ADMIN_PASS_HASH = '$2b$10$5V7Y6WXJhpF8kOTpm3WHSu1iVDC2g0UvsTclW9XsItTzMN.l7ZkHG'; 
// hash de MotDePasseSecurise123!

// Middleware d'authentification pour admin
function requireAdmin(req, res, next) {
  if (req.session.username === ADMIN_USER) next();
  else res.redirect('/admin/login');
}

// Routes

app.get('/admin/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER) {
    const match = await bcrypt.compare(password, ADMIN_PASS_HASH);
    if (match) {
      req.session.username = username;
      return res.redirect('/admin');
    }
  }
  res.render('login', { error: 'Nom utilisateur ou mot de passe incorrect.' });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

app.get('/admin', requireAdmin, (req, res) => {
  res.render('admin', { data });
});

app.post('/admin/save', requireAdmin, upload.single('logoFile'), (req, res) => {
  // Mettre à jour logo
  if(req.file) {
    data.logo = '/uploads/' + req.file.filename;
  }
  // Mettre à jour whatsapp
  if(req.body.whatsapp) {
    data.whatsapp = req.body.whatsapp.trim();
  }
  // Mettre à jour programmes (description + tarif)
  data.programmes.forEach((prog) => {
    if(req.body[`desc-${prog.id}`]) {
      prog.description = req.body[`desc-${prog.id}`].trim();
    }
    if(req.body[`tarif-${prog.id}`]) {
      prog.tarif = parseFloat(req.body[`tarif-${prog.id}`]) || 0;
    }
  });
  // Sauvegarder dans fichier
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  res.redirect('/admin');
});

// API pour ajouter/supprimer inscription (simplifié)
app.post('/admin/inscriptions/delete', requireAdmin, (req, res) => {
  const index = parseInt(req.body.index);
  if(!isNaN(index) && index >=0 && index < data.inscriptions.length) {
    data.inscriptions.splice(index,1);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }
  res.redirect('/admin');
});

// Route publique pour inscription (exemple simple enregistrant dans data.json)
app.get('/inscription', (req, res) => {
  const programmes = data.programmes;
  res.render('inscription', { programmes, whatsapp: data.whatsapp });
});

app.post('/inscription', (req, res) => {
  const { nom, prenom, email, programme } = req.body;
  if(nom && prenom && email && programme) {
    data.inscriptions.push({ nom, prenom, email, programme });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return res.send('Merci pour votre inscription. <a href="/">Retour à l\'accueil</a>');
  }
  res.send('Merci de remplir tous les champs. <a href="/inscription">Réessayer</a>');
});

// Démarrage serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

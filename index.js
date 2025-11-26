
const express = require('express');
const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
const db = admin.firestore();

// Middleware
app.use(express.json());

// API Routes - must be defined before static files

// Get all collections
app.get('/collections', async (req, res) => {
  try {
    const collections = await db.listCollections();
    const collectionIds = collections.map(col => col.id);
    res.json(collectionIds);
  } catch (error) {
    console.error('Error getting collections:', error);
    res.status(500).json({ error: 'Failed to get collections' });
  }
});

// Get documents from a specific collection
app.get('/collections/:id', async (req, res) => {
  try {
    const collectionId = req.params.id;
    const snapshot = await db.collection(collectionId).get();
    const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(documents);
  } catch (error) {
    console.error('Error getting collection documents:', error);
    res.status(500).json({ error: 'Failed to get collection documents' });
  }
});

// ==================== SERVICES ====================

// Get services count
app.get('/services/count', async (req, res) => {
  try {
    const snapshot = await db.collection('services').count().get();
    res.json({ count: snapshot.data().count });
  } catch (error) {
    console.error('Error getting services count:', error);
    res.status(500).json({ error: 'Failed to get services count' });
  }
});

// Get all services with pagination
app.get('/services', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const categoria = req.query.categoria || '';
    const segmento = req.query.segmento || '';
    
    // Get all docs (Firestore doesn't support text search natively)
    const snapshot = await db.collection('services').get();
    let services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Apply filters in memory
    if (search) {
      const searchLower = search.toLowerCase();
      services = services.filter(s => 
        (s.id && s.id.toLowerCase().includes(searchLower)) ||
        (s.tipo && s.tipo.toLowerCase().includes(searchLower)) ||
        (s.servico && s.servico.toLowerCase().includes(searchLower))
      );
    }
    
    if (categoria) {
      services = services.filter(s => s.categoria === categoria);
    }
    
    if (segmento) {
      services = services.filter(s => s.segmento === segmento);
    }
    
    const filteredTotal = services.length;
    
    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedServices = services.slice(offset, offset + limit);
    
    res.json({
      data: paginatedServices,
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit),
        hasNext: page < Math.ceil(filteredTotal / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error getting services:', error);
    res.status(500).json({ error: 'Failed to get services' });
  }
});

// Get single service
app.get('/services/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    if (!docId) {
      return res.status(400).json({ error: 'Missing service id' });
    }

    const doc = await db.collection('services').doc(docId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error(`Error getting service ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to get service' });
  }
});

// Create new service
app.post('/services', async (req, res) => {
  try {
    const serviceData = req.body;

    if (!serviceData || !serviceData.id) {
      return res.status(400).json({ error: 'Missing service data or id' });
    }

    const docId = serviceData.id;
    const payload = {
      ...serviceData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('services').doc(docId).set(payload);
    const createdDoc = await db.collection('services').doc(docId).get();

    res.status(201).json({
      success: true,
      data: { id: createdDoc.id, ...createdDoc.data() }
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Update service
app.put('/services/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    const serviceData = req.body;

    if (!docId) {
      return res.status(400).json({ error: 'Missing service id' });
    }

    if (!serviceData || Object.keys(serviceData).length === 0) {
      return res.status(400).json({ error: 'Missing service data' });
    }

    const payload = {
      ...serviceData,
      id: docId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('services').doc(docId).set(payload, { merge: true });
    const updatedDoc = await db.collection('services').doc(docId).get();

    res.json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() }
    });
  } catch (error) {
    console.error(`Error updating service ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Delete service
app.delete('/services/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    if (!docId) {
      return res.status(400).json({ error: 'Missing service id' });
    }

    await db.collection('services').doc(docId).delete();

    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    console.error(`Error deleting service ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// ==================== PRICES ====================

// Get prices count
app.get('/prices/count', async (req, res) => {
  try {
    const snapshot = await db.collection('prices').count().get();
    res.json({ count: snapshot.data().count });
  } catch (error) {
    console.error('Error getting prices count:', error);
    res.status(500).json({ error: 'Failed to get prices count' });
  }
});

// Get all prices with pagination
app.get('/prices', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const env = req.query.env || '';
    
    // Get all docs (Firestore doesn't support text search natively)
    const snapshot = await db.collection('prices').get();
    let prices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Apply filters in memory
    if (search) {
      const searchLower = search.toLowerCase();
      prices = prices.filter(p => 
        (p.id && p.id.toLowerCase().includes(searchLower)) ||
        (p.code && p.code.toLowerCase().includes(searchLower))
      );
    }
    
    if (env) {
      prices = prices.filter(p => p.prices && p.prices[env]);
    }
    
    const filteredTotal = prices.length;
    
    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedPrices = prices.slice(offset, offset + limit);
    
    res.json({
      data: paginatedPrices,
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit),
        hasNext: page < Math.ceil(filteredTotal / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error getting prices:', error);
    res.status(500).json({ error: 'Failed to get prices' });
  }
});

// Get single price
app.get('/prices/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    if (!docId) {
      return res.status(400).json({ error: 'Missing price id' });
    }

    const doc = await db.collection('prices').doc(docId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Price not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error(`Error getting price ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to get price' });
  }
});

// Create new price
app.post('/prices', async (req, res) => {
  try {
    const priceData = req.body;

    if (!priceData || !priceData.id) {
      return res.status(400).json({ error: 'Missing price data or id' });
    }

    const docId = priceData.id;
    const payload = {
      ...priceData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('prices').doc(docId).set(payload);
    const createdDoc = await db.collection('prices').doc(docId).get();

    res.status(201).json({
      success: true,
      data: { id: createdDoc.id, ...createdDoc.data() }
    });
  } catch (error) {
    console.error('Error creating price:', error);
    res.status(500).json({ error: 'Failed to create price' });
  }
});

// Update price
app.put('/prices/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    const priceData = req.body;

    if (!docId) {
      return res.status(400).json({ error: 'Missing price id' });
    }

    if (!priceData || Object.keys(priceData).length === 0) {
      return res.status(400).json({ error: 'Missing price data' });
    }

    const payload = {
      ...priceData,
      id: docId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('prices').doc(docId).set(payload, { merge: true });
    const updatedDoc = await db.collection('prices').doc(docId).get();

    res.json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() }
    });
  } catch (error) {
    console.error(`Error updating price ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

// Delete price
app.delete('/prices/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    if (!docId) {
      return res.status(400).json({ error: 'Missing price id' });
    }

    await db.collection('prices').doc(docId).delete();

    res.json({ success: true, message: 'Price deleted successfully' });
  } catch (error) {
    console.error(`Error deleting price ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete price' });
  }
});

// Get all documents from jactoUsers collection
app.get('/jacto-users', async (req, res) => {
  try {
    const snapshot = await db.collection('jactoUsers').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (error) {
    console.error('Error getting jactoUsers:', error);
    res.status(500).json({ error: 'Failed to get jactoUsers collection' });
  }
});

// Get single jactoUser document
app.get('/jacto-users/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    if (!docId) {
      return res.status(400).json({ error: 'Missing user id' });
    }

    const doc = await db.collection('jactoUsers').doc(docId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error(`Error getting jactoUser ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update jactoUser document
app.put('/jacto-users/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    const userData = req.body;

    if (!docId) {
      return res.status(400).json({ error: 'Missing user id' });
    }

    if (!userData || Object.keys(userData).length === 0) {
      return res.status(400).json({ error: 'Missing user data' });
    }

    const payload = {
      ...userData,
      id: docId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('jactoUsers').doc(docId).set(payload, { merge: true });
    const updatedDoc = await db.collection('jactoUsers').doc(docId).get();

    res.json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() }
    });
  } catch (error) {
    console.error(`Error updating jactoUser ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete jactoUser document
app.delete('/jacto-users/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    if (!docId) {
      return res.status(400).json({ error: 'Missing user id' });
    }

    await db.collection('jactoUsers').doc(docId).delete();

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error(`Error deleting jactoUser ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Static files - must be after API routes
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to view the application`);
});

module.exports = app;

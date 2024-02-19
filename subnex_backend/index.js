const express = require('express');
const cors = require('cors');
const { onSnapshot, getDocs, query, collection, where, updateDoc,deleteDoc } = require('firebase/firestore');
const { getFirestore } = require('firebase/firestore');
const app = express();
const Job = require("./config");
const { auth, ShoppersignUp, ShoppersignIn, VendorsignIn, VendorsignUp,getUserInfo, SubmitBid, GetAllSubmittedBids,DeleteJobById, SaveVendorPreferences, AddToShopPending,AddToVendorPending,DeleteFromShopPending,DeleteFromVendorPending,AddToShopCompleted,AddToVendorCompleted,getShopJobsFromCollection,getVendorJobsFromCollection, deleteBid,deleteVendorPreference,getVendorPreferences , GetBidsFromVendor, GetBidsFromShop} = require("./authen");
const {PostJob} = require("./authen");
const functions = require('firebase-functions');
const multer = require('multer');

app.use(express.json());
app.use(cors());

// ... Your existing routes ...

const upload = multer({ storage: multer.memoryStorage() });

// Logging the rejected field from multer error
app.use((error, req, res, next) => {
  console.log('This is the rejected field ->', error.field);
  res.status(400).json({ error: 'Unexpected field in the request' });
});



app.post('/vendor-signup', upload.single('taxId'), async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await VendorsignUp(req, res, email, password);

    // Check if there's an error in the result
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Send the response here, once.
    res.send({ msg: 'User signed up successfully', user: result });
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(500).send({ error: `Internal Server Error: ${error.message}` });
  }
});
// ... Your existing routes ...

app.post('/jobs/add', upload.single('jobPicture'), async (req, res) => {
  try {
    // Call the PostJob function after successful file upload
    const result = await PostJob(req, res);

    // Do not send a response here
  } catch (error) {
    console.error('Error posting job:', error);
    // Do not send a response here
  }
});

// Endpoint to get all jobs
app.get("/jobs/all", async (req, res) => {
  try {
    const db = getFirestore(Job._app);
    const allJobsQuery = query(collection(db, "Jobs"));

    // Retrieve all jobs without any category filter
    const snapshot = await getDocs(allJobsQuery);

    // Process the snapshot and send the data
    const jobs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.send(jobs);
  } catch (error) {
    console.error('Error getting all jobs:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});


// Endpoint to get jobs with category 'pending'
app.get("/jobs/pending", (req, res) => {
  try {
    const db = getFirestore(Job._app);
    const allJobsQuery = query(collection(db, "Jobs"));
    const q = query(allJobsQuery, where("status", "==", "pending"));

    onSnapshot(q, (snapshot) => {
      const jobs = [];
      snapshot.forEach((doc) => {
        jobs.push({ id: doc.id, ...doc.data() });
      });
      res.send(jobs);
    });
  } catch (error) {
    console.error('Error getting pending jobs:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});
// Endpoint to update the status of a job from pending to completed based on email
app.put("/jobs/update-status/:email", async (req, res) => {
  try {
    const email = req.params.email;
    console.log(email);

    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required.' });
    }

    const db = getFirestore(Job._app);
    const jobsCollection = collection(db, 'Jobs');

    // Find the job with the specified email and status 'pending'
    const querySnapshot = await getDocs(query(jobsCollection, where("email", "==", email, "status", "==", "pending")));

    console.log(querySnapshot);

    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'No job found with the given email and status "pending".' });
    }

    // Update the status of the first matching job to 'completed'
    const jobDoc = querySnapshot.docs[0];
    await updateDoc(jobDoc.ref, { status: 'completed' });

    res.json({ msg: 'Job status updated to "completed" successfully' });
  } catch (error) {
    console.error('Error updating job status:', error);

    // Send a response if necessary
    if (!res.headersSent) {
      res.status(500).json({ error: `Internal Server Error: ${error.message || 'Unknown error'}` });
    } else {
      // If headers are already sent, log the error and re-throw it
      console.error('Error updating job status:', error);
      throw error;
    }
  }
});

// Endpoint to get jobs with category 'completed'
app.get("/jobs/completed", (req, res) => {
  try {
    const db = getFirestore(Job._app);
    const allJobsQuery = query(collection(db, "Jobs"));
    const q = query(allJobsQuery, where("status", "==", "completed"));

    onSnapshot(q, (snapshot) => {
      const jobs = [];
      snapshot.forEach((doc) => {
        jobs.push({ id: doc.id, ...doc.data() });
      });
      res.send(jobs);
    });
  } catch (error) {
    console.error('Error getting pending jobs:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Endpoint to get all jobs
app.get("/", async (req, res) => {
  try {
    const db = getFirestore(Job._app);
    const allJobsQuery = query(collection(db, "Jobs"));
    const snapshot = await getDocs(allJobsQuery);
    const list = snapshot.docs.map((doc) => doc.data());
    res.send(list);
  } catch (error) {
    console.error('Error getting all jobs:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

app.post("/shopper-signup", async (req, res) => {
  try {
    const { email, password, ...userInfo } = req.body;
    const user = await ShoppersignUp(email, password, userInfo);
    res.send({ msg: 'User signed up successfully', user });
  } catch (error) {
    if (error.message === 'Email already in use') {
      res.status(401).send({ error: 'Email already in use' });
    } else {
      console.error('Error signing up:', error);
      res.status(500).send({ error: 'Internal Server Error' });
    }
  }
});

// Signin endpoint
app.post("/shopper-signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await ShoppersignIn(email, password);
    res.send({ msg: 'User signed in successfully', user });
  } catch (error) {
    console.error('Error signing in:', error);
    res.status(401).send({ error: 'Unauthorized' });
  }
});
const Storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, "./public/Images");
  },
  filename: function (req, file, cb) {
    return cb(null, `${Date.now()}_${file.originalname}`);
  },
});

// Endpoint to get bids from vendor using vendorId
app.get('/bids/vendor/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Retrieve bids from vendor
    const result = await GetBidsFromVendor(vendorId);

    // Send response based on the result
    if (result.success) {
      res.status(200).json({ bids: result.bids });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting bids from vendor:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to get bids from shop using shopId
app.get('/bids/shop/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;

    // Retrieve bids from shop
    const result = await GetBidsFromShop(shopId);

    // Send response based on the result
    if (result.success) {
      res.status(200).json({ bids: result.bids });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting bids from shop:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Endpoint to get user info by email and role
app.get('/user-info', async (req, res) => {
  try {
    const { role, email } = req.query;

    if (!role || !email) {
      return res.status(400).json({ error: 'Role and email are required parameters.' });
    }

    // Call the function to get user info
    const userInfo = await getUserInfo(role, email);

    if (!userInfo) {
      return res.status(404).json({ error: 'User not found with the given email and role.' });
    }

    res.json(userInfo);
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ error: `Internal Server Error: ${error.message || 'Unknown error'}` });
  }
});

// Signin endpoint
app.post("/vendor-signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await VendorsignIn(email, password);
    res.send({ msg: 'User signed in successfully', user });
  } catch (error) {
    console.error('Error signing in:', error);
    res.status(401).send({ error: 'Unauthorized' });
  }
});
// Endpoint to handle bid submission with payment and deadline

app.post('/vendor/submit-bid', async (req, res) => {
  try {
    const { jobId, shopName, category, description, vendorId, payment, deadline ,shopId } = req.body;

    // Validate if jobId, userId, and other required fields exist
    if (!jobId || !vendorId) {
      return res.status(400).json({ error: 'Required fields are missing.' });
    }

    // Process the bid submission
    const result = await SubmitBid(jobId, shopName, category, description, vendorId, payment, deadline ,shopId);

    // Send response based on the result
    if (result.success) {
      res.status(200).json({ message: 'Bid submitted successfully', bidId: result.bidId });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error submitting bid:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Endpoint to delete a job by its ID
app.delete('/jobs/delete/:jobId', async (req, res) => {
  try {
    const jobId = req.params.jobId;

    // Validate if jobId exists
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required.' });
    }

    // Process the job deletion
    const result = await DeleteJobById(jobId);

    // Send response based on the result
    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to get all submitted bids
app.get('/bids/all', async (req, res) => {
  try {
    // Retrieve all submitted bids
    const result = await GetAllSubmittedBids();

    // Send response based on the result
    if (result.success) {
      res.status(200).json({ bids: result.bids });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting submitted bids:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Endpoint to post vendor preferences
app.post('/vendors/preferences', async (req, res) => {
  try {
    const { vendorId, notifPref, jobTypePref, distPref } = req.body;

    // Validate if all fields are present
    if (!vendorId || !notifPref || !jobTypePref || !distPref) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Save vendor preferences to the collection
    const result = await SaveVendorPreferences(vendorId, notifPref, jobTypePref, distPref);

    // Send response based on the result
    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error saving preferences:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.delete('/vendors/preferences/:preferenceId', async (req, res) => {
  try {
    const preferenceId = req.params.preferenceId;

    // Delete preference document from the collection
    await deleteVendorPreference(preferenceId);

    res.status(200).json({ message: 'Preference deleted successfully.' });
  } catch (error) {
    console.error('Error deleting preference:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Function to get preferences with a given vendor ID
app.get('/vendors/preferences/:vendorId', async (req, res) => {
  try {
    const vendorId = req.params.vendorId;

    // Get preferences document from the collection
    const preferences = await getVendorPreferences(vendorId);

    res.status(200).json(preferences);
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to add a job to ShopPending
app.post('/shop-pending/add', async (req, res) => {
  try {
    const { jobId, ...jobData } = req.body;

    // Add job to ShopPending collection
    const result = await AddToShopPending(jobId, jobData);

    // Send response based on the result
    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error adding job to ShopPending:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to add a job to VendorPending
app.post('/vendor-pending/add', async (req, res) => {
  try {
    const { jobId, ...jobData } = req.body;

    // Add job to VendorPending collection
    const result = await AddToVendorPending(jobId, jobData);

    // Send response based on the result
    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error adding job to VendorPending:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to delete a job from ShopPending by jobId
app.delete('/shop-pending/delete/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Delete job from ShopPending collection
    const result = await DeleteFromShopPending(jobId);

    // Send response based on the result
    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error deleting job from ShopPending:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to delete a job from VendorPending by jobId
app.delete('/vendor-pending/delete/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Delete job from VendorPending collection
    const result = await DeleteFromVendorPending(jobId);

    // Send response based on the result
    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error deleting job from VendorPending:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

// Endpoint to add a job to ShopCompleted
app.post('/shop-completed/add', async (req, res) => {
  try {
    const { jobId, ...jobData } = req.body;

    // Add job to ShopCompleted collection
    const result = await AddToShopCompleted(jobId, jobData);

    // Send response based on the result
    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error adding job to ShopCompleted:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to add a job to VendorCompleted
app.post('/vendor-completed/add', async (req, res) => {
  try {
    const { jobId, ...jobData } = req.body;

    // Add job to VendorCompleted collection
    const result = await AddToVendorCompleted(jobId, jobData);

    // Send response based on the result
    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error adding job to VendorCompleted:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to get shop-pending jobs
app.get('/vendor-pending/:userId', async (req, res) => {
  try {
    const {userId} = req.params; // Get userId from URL parameter
    const result = await getVendorJobsFromCollection('VendorPending', userId);

    if (result.success) {
      res.status(200).json(result.jobs);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting vendor-pending jobs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/shop-pending/:shopId', async (req, res) => {
  try {
    const shopId = req.params.shopId; // Access shopId from URL parameter
    const result = await getShopJobsFromCollection('ShopPending', shopId);

    if (result.success) {
      res.status(200).json(result.jobs);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting shop-pending jobs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Endpoint to get shop-completed jobs
app.get('/shop-completed', async (req, res) => {
  try {
    const result = await getShopJobsFromCollection('ShopCompleted');

    if (result.success) {
      res.status(200).json(result.jobs);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting shop-completed jobs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to get vendor-completed jobs
app.get('/vendor-completed', async (req, res) => {
  try {
    const result = await getVendorJobsFromCollection('VendorCompleted');

    if (result.success) {
      res.status(200).json(result.jobs);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting vendor-completed jobs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to delete a bid
app.delete('/vendor-submitted-bids/:bidId', async (req, res) => {
  try {
    const bidId = req.params.bidId;

    if (!bidId) {
      return res.status(400).json({ error: 'Bid ID is required.' });
    }

    const result = await deleteBid(bidId);

    if (result.success) {
      res.status(200).json({ message: 'Bid deleted successfully.' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error deleting bid:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(3000, () => console.log("Up and Running on port 3000"));

// exports.api = functions.https.onRequest(app);
module.exports = app;
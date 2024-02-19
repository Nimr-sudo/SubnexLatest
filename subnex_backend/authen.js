const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc,serverTimestamp ,deleteDoc,doc} = require('firebase/firestore');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const multer = require('multer');
const { getDocs } = require('firebase/firestore');
const { query } = require('firebase/firestore');
const { where } = require('firebase/firestore');

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC4u0r_zvGQ8eT5LgLZYSLVA0z1mjPmBik",
  authDomain: "subnexproject-b0296.firebaseapp.com",
  projectId: "subnexproject-b0296",
  storageBucket: "subnexproject-b0296.appspot.com",
  messagingSenderId: "58718181857",
  appId: "1:58718181857:web:723b8949c87ab73f4a9aa0",
  measurementId: "G-L205FJQ3E4"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      return cb(null, "./public/Images");
    },
    filename: function (req, file, cb) {
      return cb(null, `${Date.now()}_${file.originalname}`);
    },
  }),
});

const ShoppersignUp = async (email, password, userInfo) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid } = userCredential.user;

    const db = getFirestore(firebaseApp);
    const shopperCollection = collection(db, "Shoppers");
    const userDocRef = await addDoc(shopperCollection, { uid, email, ...userInfo });

    return { uid, docId: userDocRef.id, email, password, ...userInfo };
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email already in use');
    } else {
      throw error;
    }
  }
};

const ShoppersignIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};


const VendorsignUp = async (req, res, email, password) => {
  try {
    const { fullName, preferences, businessName, agreeTerms , phoneNumber } = req.body;

    // Step 1: Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid } = userCredential.user;

    const taxIdFile = req.file;

    if (!taxIdFile) {
      return { error: 'No taxId file provided' };
    }

    const storageRef = ref(storage, `taxId/${taxIdFile.originalname}`);
    const blobStream = uploadBytes(storageRef, taxIdFile.buffer);

    await blobStream;
    const taxIdDownloadURL = await getDownloadURL(storageRef);

    console.log('Tax ID Download URL:', taxIdDownloadURL);

    const db = getFirestore(firebaseApp);
    const vendorCollection = collection(db, 'Vendors');

    const userDocRef = await addDoc(vendorCollection, {
      uid,
      email,
      fullName,
      preferences,
      taxId: taxIdDownloadURL,
      businessName,
      phoneNumber,
      agreeTerms,
    });

    const responseObject = {
      uid,
      docId: userDocRef.id,
      email,
      password,
      fullName,
      preferences,
      phoneNumber,
      businessName,
      agreeTerms,
      taxId: taxIdDownloadURL,
    };

    return responseObject;
  } catch (error) {
    console.error('Error in VendorsSignup:', error);
    if (error.code === 'auth/email-already-in-use') {
      return { error: 'Email already in use' };
    } else {
      return { error: `Internal server error: ${error.message}` };
    }
  }
};

const VendorsignIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

const PostJob = async (req, res) => {
  try {
    const { email, category, make, description, shopName, shopAddress, model, year, biddingDeadline, latitude, longitude ,shopId} = req.body;

    const jobPictureFile = req.file;

    if (!jobPictureFile) {
      // Send a response to the client immediately
      return res.status(400).json({ error: 'No jobPicture file provided' });
    }

    // Upload jobPicture to storage
    const storageRef = ref(storage, `jobPictures/${jobPictureFile.originalname}`);
    const blobStream = uploadBytes(storageRef, jobPictureFile.buffer);
    await blobStream;

    // Get downloadable link for jobPicture
    const jobPictureDownloadURL = await getDownloadURL(storageRef);
    console.log('Job Picture Download URL:', jobPictureDownloadURL);

    // Create job document in Firestore with status set to 'pending'
    const db = getFirestore(firebaseApp);
    const jobsCollection = collection(db, 'Jobs');

    const jobDocRef = await addDoc(jobsCollection, {
      email,
      category,
      make,
      description,
      shopName,
      shopAddress,
      model,
      year,
      shopId,
      biddingDeadline,
      latitude,
      longitude,
      jobPicture: jobPictureDownloadURL,
      status: 'pending', // Add status field with default value 'pending'
    });

    const responseObject = {
      docId: jobDocRef.id,
      email,
      category,
      make,
      description,
      shopName,
      shopAddress,
      model,
      year,
      biddingDeadline,
      latitude,
      longitude,
      jobPicture: jobPictureDownloadURL,
      status: 'pending', // Include status in the response
    };

    // Send the response to the client
    res.status(200).json({ msg: 'Job posted successfully', job: responseObject });
  } catch (error) {
    console.error('Error in PostJob:', error);
    res.status(500).json({ error: `Internal Server Error: ${error.message || 'Unknown error'}` });
  }
};
const GetBidsFromVendor = async (vendorId) => {
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Query to retrieve all documents from the VendorSubmittedBids collection
    const querySnapshot = await getDocs(
      query(collection(db, 'VendorSubmittedBids'), where('vendorId', '==', vendorId))
    );

    // Process the snapshot and collect all bids
    const bids = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, bids };
  } catch (error) {
    console.error('Error getting bids from vendor:', error);
    return { success: false, error: 'Internal Server Error' };
  }
};

const GetBidsFromShop = async (shopId) => {
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Query to retrieve all documents from the ShopPending collection
    const querySnapshot = await getDocs(
      query(collection(db, 'VendorSubmittedBids'), where('shopId', '==', shopId))
    );

    // Process the snapshot and collect all bids
    const bids = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, bids };
  } catch (error) {
    console.error('Error getting bids from shop:', error);
    return { success: false, error: 'Internal Server Error' };
  }
};


const getUserInfo = async (role, email) => {
  try {
    const db = getFirestore(firebaseApp);

    if (role.toLowerCase() === 'vendor') {
      // Search for the vendor in the Vendors collection
      const vendorCollection = collection(db, 'Vendors');
      const querySnapshot = await getDocs(query(vendorCollection, where('email', '==', email)));

      if (querySnapshot.size === 0) {
        // No vendor found with the given email
        return null;
      }

      // Assuming there is only one vendor with the given email
      const vendorData = querySnapshot.docs[0].data();
      return vendorData;
    } else if (role.toLowerCase() === 'shop') {
      // Search for the shopper in the Shoppers collection
      const shopperCollection = collection(db, 'Shoppers');
      const querySnapshot = await getDocs(query(shopperCollection, where('email', '==', email)));

      if (querySnapshot.size === 0) {
        // No shopper found with the given email
        return null;
      }

      // Assuming there is only one shopper with the given email
      const shopperData = querySnapshot.docs[0].data();
      return shopperData;
    } else {
      // Invalid role provided
      throw new Error('Invalid role. Supported roles are "Vendor" and "Shop".');
    }
  } catch (error) {
    console.error('Error in getUserInfo:', error);
    throw error;
  }
};
// Function to handle bid submission
const SubmitBid = async (jobId, shopName, category, description, vendorId, payment, deadline ,shopId) => { // Add payment and deadline as parameters
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Add bid data to the VendorSubmittedBids collection with current timestamp
    const bidDocRef = await addDoc(collection(db, 'VendorSubmittedBids'), {
      jobId,
      shopName,
      category,
      shopId,
      description,
      payment, // Include payment in the bid data
      deadline, // Include deadline in the bid data
      date: serverTimestamp(), // Set the date to the current server timestamp
      vendorId:vendorId,
    });

    console.log('Bid submitted successfully. Document ID:', bidDocRef.id);
    return { success: true, bidId: bidDocRef.id };
  } catch (error) {
    console.error('Error submitting bid:', error);
    return { success: false, error: 'Internal Server Error' };
  }
};


// Function to delete a job by its ID
const DeleteJobById = async (jobId) => {
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Reference to the job document by its ID
    const jobDocRef = doc(db, 'Jobs', jobId);

    // Delete the job document
    await deleteDoc(jobDocRef);

    return { success: true, message: 'Job deleted successfully' };
  } catch (error) {
    console.error('Error deleting job:', error);
    return { success: false, error: 'Internal Server Error' };
  }
};

// Function to get all submitted bids
const GetAllSubmittedBids = async () => {
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Query to retrieve all documents from the VendorSubmittedBids collection
    const querySnapshot = await getDocs(collection(db, 'VendorSubmittedBids'));

    // Process the snapshot and collect all bids
    const bids = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, bids };
  } catch (error) {
    console.error('Error getting submitted bids:', error);
    return { success: false, error: 'Internal Server Error' };
  }
};

const SaveVendorPreferences = async (vendorId, notifPref, jobTypePref, distPref) => {
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Add document to the VendorPreferences collection
    await addDoc(collection(db, 'VendorPreferences'), {
      vendorId,
      notifPref,
      jobTypePref,
      distPref
    });

    return { success: true, message: 'Preferences saved successfully.' };
  } catch (error) {
    console.error('Error saving preferences:', error);
    return { success: false, error: 'Internal Server Error' };
  }
};

// Function to delete preference document with a given ID
const deleteVendorPreference = async (preferenceId) => {
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Delete document from the VendorPreferences collection
    await deleteDoc(doc(db, 'VendorPreferences', preferenceId));
  } catch (error) {
    console.error('Error deleting preference:', error);
    throw error;
  }
};

// Function to get preferences document with a given vendor ID
// Function to add a job to the ShopPending collection
const AddToShopPending = async (jobId, jobData) => {
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Add document to the ShopPending collection
    await addDoc(collection(db, 'ShopPending'), {
      jobId,
      ...jobData
    });

    return { success: true, message: 'Job added to ShopPending successfully.' };
  } catch (error) {
    console.error('Error adding job to ShopPending:', error);
    return { success: false, error: 'Internal Server Error' };
  }
};

// Function to add a job to the VendorPending collection
const AddToVendorPending = async (jobId, jobData) => {
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Add document to the VendorPending collection
    await addDoc(collection(db, 'VendorPending'), {
      jobId,
      ...jobData
    });

    return { success: true, message: 'Job added to VendorPending successfully.' };
  } catch (error) {
    console.error('Error adding job to VendorPending:', error);
    return { success: false, error: 'Internal Server Error' };
  }
};

// Function to delete a document from the ShopPending collection by jobId
const DeleteFromShopPending = async (jobId) => {
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Delete document from the ShopPending collection by jobId
    await deleteDoc(doc(db, 'ShopPending', jobId));

    return { success: true, message: 'Job deleted from ShopPending successfully.' };
  } catch (error) {
    console.error('Error deleting job from ShopPending:', error);
    return { success: false, error: 'Internal Server Error' };
  }
};

// Function to delete a document from the VendorPending collection by jobId
const DeleteFromVendorPending = async (jobId) => {
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Delete document from the VendorPending collection by jobId
    await deleteDoc(doc(db, 'VendorPending', jobId));

    return { success: true, message: 'Job deleted from VendorPending successfully.' };
  } catch (error) {
    console.error('Error deleting job from VendorPending:', error);
    return { success: false, error: 'Internal Server Error' };
  }
};

// Function to add a job to the ShopCompleted collection
const AddToShopCompleted = async (jobId, jobData) => {
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Add document to the ShopCompleted collection
    await addDoc(collection(db, 'ShopCompleted'), {
      jobId,
      ...jobData
    });

    return { success: true, message: 'Job added to ShopCompleted successfully.' };
  } catch (error) {
    console.error('Error adding job to ShopCompleted:', error);
    return { success: false, error: 'Internal Server Error' };
  }
};

// Function to add a job to the VendorCompleted collection
const AddToVendorCompleted = async (jobId, jobData) => {
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Add document to the VendorCompleted collection
    await addDoc(collection(db, 'VendorCompleted'), {
      jobId,
      ...jobData
    });

    return { success: true, message: 'Job added to VendorCompleted successfully.' };
  } catch (error) {
    console.error('Error adding job to VendorCompleted:', error);
    return { success: false, error: 'Internal Server Error' };
  }
};

const getVendorJobsFromCollection = async (collectionName, userId) => {
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Get all documents from the specified collection
    const querySnapshot = await getDocs(collection(db, collectionName));
    
    // Filter jobs by vendorId
    const jobs = querySnapshot.docs
      .filter(doc => doc.data().vendorid === userId) // Change to vendorid
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    return { success: true, jobs };
  } catch (error) {
    console.error(`Error getting jobs from ${collectionName}:`, error);
    return { success: false, error: 'Internal Server Error' };
  }
};

const getVendorPreferences = async (vendorId) => {
  try {
    const db = getFirestore(firebaseApp);

    // Search for the vendor preferences in the VendorPreferences collection
    const preferencesCollection = collection(db, 'VendorPreferences');
    const querySnapshot = await getDocs(query(preferencesCollection, where('vendorId', '==', vendorId)));

    if (querySnapshot.size === 0) {
      // No preferences found for the given vendorId
      return null;
    }

    // Assuming there is only one set of preferences for the given vendorId
    const preferencesData = querySnapshot.docs[0].data();
    return preferencesData;
  } catch (error) {
    console.error('Error in getVendorPreferences:', error);
    throw error;
  }
};

const getShopJobsFromCollection = async (collectionName, shopId) => {
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Get all documents from the specified collection
    const querySnapshot = await getDocs(collection(db, collectionName));
    
    // Filter jobs by shopId
    const jobs = querySnapshot.docs
      .filter(doc => doc.data().shopId === shopId)
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    return { success: true, jobs };
  } catch (error) {
    console.error(`Error getting jobs from ${collectionName}:`, error);
    return { success: false, error: 'Internal Server Error' };
  }
};

const deleteBid = async (bidId) => {
  try {
    const db = getFirestore(); // Assuming Firebase is initialized elsewhere

    // Delete the bid document with the specified bidId
    await deleteDoc(doc(db, 'VendorSubmittedBids', bidId));

    console.log('Bid deleted successfully:', bidId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting bid:', error);
    return { success: false, error: 'Internal Server Error' };
  }
};

module.exports = { auth, ShoppersignUp, ShoppersignIn, VendorsignIn, VendorsignUp,PostJob,getUserInfo,SubmitBid,
DeleteJobById,GetAllSubmittedBids,SaveVendorPreferences ,AddToVendorPending,DeleteFromShopPending, AddToShopPending,DeleteFromVendorPending,
AddToShopCompleted,AddToVendorCompleted,getVendorJobsFromCollection,getShopJobsFromCollection,deleteBid, getVendorPreferences , deleteVendorPreference, GetBidsFromVendor,GetBidsFromShop};

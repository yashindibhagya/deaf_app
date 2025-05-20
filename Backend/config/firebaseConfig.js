// backend/config/firebaseConfig.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');

// Function to get Firebase configuration
const getFirebaseConfig = () => {
    // Try to load service account from file
    let serviceAccount;
    try {
        const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            console.log('Loading Firebase credentials from service account file');
            serviceAccount = require(serviceAccountPath);
        } else {
            throw new Error('Service account file not found');
        }
    } catch (error) {
        console.log('Service account file not found. Using environment variables or default credentials');

        // If no service account file, try to use environment variables
        if (process.env.FIREBASE_PROJECT_ID) {
            console.log('Using Firebase credentials from environment variables');
            serviceAccount = {
                "type": "service_account",
                "project_id": process.env.FIREBASE_PROJECT_ID,
                "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
                "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                "client_email": process.env.FIREBASE_CLIENT_EMAIL,
                "client_id": process.env.FIREBASE_CLIENT_ID,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": process.env.FIREBASE_CLIENT_CERT_URL,
                "universe_domain": "googleapis.com"
            };
        } else {
            // Default credentials for development (these should be replaced in production)
            console.log('Using default Firebase credentials for development environment');
            serviceAccount = {
                "type": "service_account",
                "project_id": "gestureconnect-8aa03",
                "private_key_id": "deb99937061067fb6ac295f64f77e1047129c4ae",
                "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCk2ThbPNp1cn/K\nRuZduGWMTGjRsoDn1j6wm+1oVM9c+/XCo3a7L20JHYX06hs+Wzsr11JDlBBJY+rv\nF2Dm1+p45f8tNNgAjQSq5lrNMxkIWn9efzrHUksyhtWOHQtXqe116jwvlh6h+abe\nvqo2aXdTqrxShOCdK0fCzVGlFZVXeJTaRjy8U3x0emfu4j0wuOFw+6z8LgQoVKbi\nEN/rqi76PZQSUi4gHgZiFYktmKQDsqZYnRTGyP4Q2/FXFOPqPa6YEu/AiNUSQVU0\nE6l4Xw1UpdAhNkVVSI6EP/FgBbG7QEgC1FJeBR+YPhzNWxWzCbgnNmFTZS6ObiNL\nGijwLYK9AgMBAAECggEAAJoPZ9vcw01/9G3WVPTBoCW+Qze220HPuEbVcspOeH0t\n/EArBItrhzs9nDOHlm5wVJxkXz1I4u+zsZxA/Q7AOyFB0XkuKbBaGkKdhb7AQmTM\nLrzhqs0c26oc2Pg3rKIA7SuF/Tl70qUN7CW/itPPPPW0WsvD4yb/i9FCkUr3INrd\nFjMnIkjnW1CMS2BA+I2/OQ4o9O008heNckBwhd6aXfSYh7UMB+2SrBzySfcKWYEG\nSHWKCM1D9xBFLTQck396oJyXGkg9vvH4kUsZFlYf2XL035kjLetYYUjlCQi4vcyJ\n/kQW1IRd16rLiBcRYFcsnWiLiQua9u3krZHcGGz84QKBgQDRfMAuPTG6T1JucwwQ\nK3DMpTVUDanIh69mawd35LF8ySOfO2AV8CjEaCHMdHvVhzMJjxXFgvCX6oQCL9qQ\nXL0O7U8oheVcR3952qCz+NQaEGE4pap4kQo6A/dPIfugbw3zpfK1Iv/QhmxtY0hh\nAnJcELm26TTM5MED+u28CS8+nQKBgQDJczPX/ifCckyBdNR3l6POYwoDPPy+60fa\nOJAziJNTs2o4/v0TIatR09bzp+hOkpF+2Cn1SWjVFCtFlapgz4Q8DxzlDu9pnMhD\nZIHMo/bSjYD4Qo5yBcFag7wetRIQvZXLnDD1qQV1jcsNbj8lrIZJiq3yRrpm+c/I\nahS1W4kKoQKBgDg8TfbbtJK4In/F4JIipzg4jVVQCajsS7ipuKqFuOOvtyFSthuN\nidQXxCL3jhqnHZtOTuDjoqSVbvSLVhf03Ue5isttDkI0a1MRzpwhiwaoKQEk79tH\nzEAAuo4CqGLMDSm//aSEjbmzrD29LjvkhUCTuNcSSXtLWUkxPkqBCK69AoGAPRSI\nEKKILaX4Wnww+73ntelDnO29+KlgFON3nZh4izVoLLXryAQ6bModb61me4RnRx2F\nw1Cpz4mZATU6/rWM86TlbvJTVyNpeT2dOY4xhW/QPfX4OMxT7vzoaiseuiKxq5XF\nJodEF3uRqJXX4bVo1h2NVltpo1V1UeAQPVjuuWECgYAjtjf0UBQMODO4lg0t0KAP\n5Tr6eSQpzMuV2SGBkII49QNCtCe6gwfkNr4Nh+HnIyv+fuO2h7aakI46k1FFM/S8\nZnlFK13SqPd8STvOEQRbpR7QXCPoa9pr8z0WELLz6pdnquOlRIsNhLztPkwFni5d\ns/rbB0L4J/L+G5hvW4jRBg==\n-----END PRIVATE KEY-----\n",
                "client_email": "firebase-adminsdk-fbsvc@gestureconnect-8aa03.iam.gserviceaccount.com",
                "client_id": "115971354392282607890",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40gestureconnect-8aa03.iam.gserviceaccount.com",
                "universe_domain": "googleapis.com"
            };
        }
    }

    return serviceAccount;
};

// Initialize Firebase Admin
const serviceAccount = getFirebaseConfig();
const app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: serviceAccount.project_id ? `${serviceAccount.project_id}.appspot.com` : "gestureconnect-8aa03.appspot.com"
});

// Initialize Firebase services
const db = getFirestore();
const auth = getAuth();
const storage = getStorage();

console.log(`Firebase Admin SDK initialized successfully for project: ${serviceAccount.project_id}`);

module.exports = {
    db,
    auth,
    storage,
    app
};
let postvalue = document.getElementById("textarea");
var progressDiv = document.getElementById("progressdiv");
var progressbar = document.getElementById("progressbar");
let currentuser = "";
let url = "";
let fileType = "";
var done = document.getElementById("done");
let uid;
let alluser = [];
let userimg = document.getElementById("userimg");
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    if (user.emailVerified) {
      uid = user.uid;
      console.log("Email is verified!");
    } else {
      window.location.assign("./email.html");
    }
  } else {
    window.location.assign("./Login.html");
  }
});

firebase.auth().onAuthStateChanged((user) => {
  currentuser = user;
});

// Modified image upload function with content classification
let uploadimg = async (event) => {
  if (!event.target.files.length) return;
  
  const file = event.target.files[0];
  fileType = file.type;
  
  try {
    // Check image content before uploading
    const classification = await classifyImage(file);
    
    switch(classification.class) {
      case 'low':
        // Allow upload without warning
        proceedWithUpload(file);
        break;
        
      case 'medium':
        // Show warning but allow upload
        showWarning("This image contains potentially sensitive content. It will be uploaded but may have limited visibility.");
        proceedWithUpload(file);
        break;
        
      case 'high':
        // Prevent upload
        showError("This image contains inappropriate content and cannot be uploaded.");
        // Clear the file input
        event.target.value = '';
        return;
        
      default:
        console.error('Unknown classification:', classification);
        showError("Couldn't determine image content. Please try again.");
        return;
    }
  } catch (error) {
    console.error("Error classifying image:", error);
    showError("Error processing image. Please try again.");
  }
};

// Function to load and classify the image
async function classifyImage(imageFile) {
  // Create a FormData object to send the file
  const formData = new FormData();
  formData.append('image', imageFile);
  
  try {
    // Send the image to the backend for classification
    const response = await fetch('http://localhost:5000/classify-image', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error classifying image:', error);
    throw error;
  }
}

// Function to proceed with image upload after classification
function proceedWithUpload(file) {
  var uploadfile = firebase
    .storage()
    .ref()
    .child(`postFiles/${file.name}`)
    .put(file);
  
  uploadfile.on(
    "state_changed",
    (snapshot) => {
      var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      var uploadpercentage = Math.round(progress);
      console.log(uploadpercentage);
      progressDiv.style.display = "block";
      progressbar.style.width = `${uploadpercentage}%`;
      progressbar.innerHTML = `${uploadpercentage}%`;
    },
    (error) => { 
      console.error("Upload error:", error);
      showError("Error uploading file. Please try again.");
    },
    () => {
      uploadfile.snapshot.ref.getDownloadURL().then((downloadURL) => {
        url = downloadURL;
        done.style.display = "block";
        progressDiv.style.display = "none";
      });
    }
  );
}

// Helper functions for displaying messages
function showWarning(message) {
  let warningElement = document.getElementById('warningMessage');
  if (!warningElement) {
    warningElement = document.createElement('div');
    warningElement.id = 'warningMessage';
    warningElement.style.backgroundColor = '#FFF3CD';
    warningElement.style.color = '#856404';
    warningElement.style.padding = '10px';
    warningElement.style.borderRadius = '5px';
    warningElement.style.marginTop = '10px';
    warningElement.style.marginBottom = '10px';
    const uploadContainer = document.querySelector('.upload-container') || document.body;
    uploadContainer.appendChild(warningElement);
  }
  
  warningElement.textContent = message;
  warningElement.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    warningElement.style.display = 'none';
  }, 5000);
}

function showError(message) {
  alert(message);
}

var d = new Date().toLocaleDateString();

function createpost() {
  if (postvalue.value !== "" || url !== "") {
    firebase
      .firestore()
      .collection("posts")
      .add({
        postvalue: postvalue.value,
        uid: currentuser.uid,
        url: url,
        filetype: fileType,
        like: [],
        dislikes: [],
        comments: [],
        Date: `${d}`
      })
      .then((res) => {
        firebase
          .firestore()
          .collection("posts/")
          .doc(res.id)
          .update({
            id: res.id
          })
          .then(() => {
            done.style.display = "none"
            document.getElementById("uploadedmssage").style.display = "block";
            setTimeout(() => {
              location.reload();
            }, 2000);
          });
      });
  }
}

const logout = () => {
  firebase.auth().signOut().then(() => {
    window.location.assign("./login.js")
  })
}
/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

function signIn() {
  window.location.href='sign-in.html';
}

function signInAnonymously() {
  firebase.auth().signInAnonymously().catch(
    (error) => {
      console.log(error.message);
    }
  )
}

// Signs-out of DamoGo Business.
function signOut() {
  firebase.auth().signOut();
  signInAnonymously();
  window.location.href="index.html";
}

// Initiate firebase auth.
function initFirebaseAuth() {
  firebase.auth().onAuthStateChanged(authStateObserver);
}

// Returns the signed-in user's display name.
function getUserName() {
  return firebase.auth().currentUser.displayName;
}

// Returns true if a user is signed-in.
function isUserSignedIn() {
  return ! (firebase.auth().currentUser == null || firebase.auth().currentUser.isAnonymous);
}

// Saves the messaging device token to the datastore.
function saveMessagingDeviceToken() {
  if(firebase.messaging.isSupported()){
    firebase.messaging().getToken().then((currentToken) => {
      if (currentToken) {
        // Saving the Device Token to the datastore.
        firebase.firestore().collection('fcmTokens').doc(currentToken)
            .set({uid: firebase.auth().currentUser.uid});
      } else {
        // Need to request permissions to show notifications.
        requestNotificationsPermissions();
      }
    }).catch((error) => {
      console.error('Unable to get messaging token.', error);
    });
  }
}

// Requests permissions to show notifications.
function requestNotificationsPermissions() {
  console.log('Requesting notifications permission...');
  firebase.messaging().requestPermission().then(() => {
    // Notification permission granted.
    saveMessagingDeviceToken();
  }).catch((error) => {
    console.error('Unable to get permission to notify.', error);
  });
}

// Template for items.
const ITEM_TEMPLATE = `<div class="card item-info">
<div class="card-image waves-effect waves-block waves-light">
  <img class="activator image" src="https://storage.googleapis.com/spec-host/mio-staging%2Fmio-material%2F1570560286703%2Fassets%2F1AjERaybjP3SVO4etBFrHVHNF0yU-9igT%2Fmda19-2x1-large.png">
</div>
<div class="card-content card-align-bottom">
  <span class="card-title title activator grey-text text-darken-4">Card Title<i class="material-icons right">more_vert</i></span>
  <span class = "price"></span>
  <span class = "originalPrice"></span>
  <a class="btn-floating add-fab waves-effect waves-light"><i class="material-icons add-fab">add</i></a>
</div>
<div class="card-reveal">
  <span class="card-title grey-text text-darken-4"><i class="material-icons right">close</i></span>
  <p class = "description" >Here is some more information about this product that is only revealed once clicked on.</p>
</div>
</div>`;

  // The Keys to differrent values in the database
const ITEM_NAME = 'name';
const ITEM_DESCRIPTION = 'description';
const ITEM_IMAGE = 'imageUrl';
const ITEM_PRICE = 'price';
const ITEM_ORIGINAL_PRICE = 'originalPrice';

// Delete a Item from the UI.
function deleteItem(id) {
  let div = document.getElementById(id);
  // If an element for that item exists we delete it.
  if (div) {
    div.parentNode.removeChild(div);
  }
}

function createAndInsertItem(id, timestamp) {
  const container = document.createElement('div');
  container.innerHTML = ITEM_TEMPLATE;
  container.setAttribute('class', 'col s12 m6 l4');
  const div = container.firstChild;
  div.setAttribute('id', id);

  // If timestamp is null, assume we've gotten a brand new item.
  // https://stackoverflow.com/a/47781432/4816918
  timestamp = timestamp ? timestamp.toMillis() : Date.now();
  div.setAttribute('timestamp', timestamp);

  // figure out where to insert new items
  const existingItems = itemsListElement.children;
  if (existingItems.length === 0) {
    itemsListElement.appendChild(container);
  } else {
    let itemsListNode = existingItems[0];

    while (itemsListNode) {

      const itemsListNodeTime = itemsListNode.firstChild.getAttribute('timestamp');

      if (!itemsListNodeTime) {
        throw new Error(
          `Child ${itemsListNode.id} has no 'timestamp' attribute`
        );
      }

      if (itemsListNodeTime > timestamp) {
        break;
      }

      itemsListNode = itemsListNode.nextSibling;
    }

    itemsListElement.insertBefore(container, itemsListNode);
  }

  return div;
}

const getContent = (item, contentName) => {
  return item[contentName]  || '';
}

// Displays an Item in the UI.
function displayItem(id, timestamp, item) {
  let div = document.getElementById(id) || createAndInsertItem(id, timestamp);

  div.querySelector('.title').textContent = getContent(item, ITEM_NAME);
  div.querySelector('img').setAttribute('src', getContent(item, ITEM_IMAGE));
  div.querySelector('.price').textContent = getContent(item, ITEM_PRICE);
  div.querySelector('.description').textContent = getContent(item, ITEM_DESCRIPTION);
  div.querySelector('.originalPrice').textContent = getContent(item, ITEM_ORIGINAL_PRICE);

  // Show the card fading-in and scroll to view the new item.
  setTimeout(() => {div.classList.add('visible')}, 1);
  itemsListElement.scrollTop = itemsListElement.scrollHeight;
}

// Loads chat items history and listens for upcoming ones.
function loadItems() {
  // Create the query to load the last 12 items and listen for new ones.
  let query = firebase.firestore().collection('items').orderBy('timestamp', 'desc').limit(12);
  
  
  // Start listening to the query.
  query.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'removed') {
        deleteItem(change.doc.id);
      } else {
        let item = change.doc.data();
        displayItem(change.doc.id, item.timestamp, item);
      }
    });
  }, (error) => {
    if(error.code == 'permission-denied'){
        if (!firebase.auth().currentUser){
          // reLoad items again
          loadItems();
        }
        
        
    }
  });
}



// Triggers when the auth state change for instance when the user signs-in or signs-out.
function authStateObserver(user) {
  if (!(user == null || user.isAnonymous)) { // User is signed in!
    // Get the signed-in user's profile pic and name.
    let userName = user.displayName;
    
    // Set the user's profile pic and name.
    userNameElement.innerHTML = userName;

    // Show user's profile and sign-out button.
    userNameElement.removeAttribute('hidden');
    signOutButtonElement.removeAttribute('hidden');
    
    // Hide sign-in button.
    signInButtonElement.setAttribute('hidden', 'true');


    // We save the Firebase Messaging Device token and enable notifications.
    saveMessagingDeviceToken();
  } else { // User is signed out!
    // Hide user's profile and sign-out button.
    userNameElement.setAttribute('hidden', 'true');
    signOutButtonElement.setAttribute('hidden', 'true');

    // Show sign-in button.
    signInButtonElement.removeAttribute('hidden');
    signInAnonymously();
  }
}

// Adds a size to Google Profile pics URLs.
function addSizeToGoogleProfilePic(url) {
  if (url.indexOf('googleusercontent.com') !== -1 && url.indexOf('?') === -1) {
    return url + '?sz=150';
  }
  return url;
}

// A loading image URL.
let LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif?a';


// Checks that the Firebase SDK has been correctly setup and configured.
function checkSetup() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions and make ' +
        'sure you are running the codelab using `firebase serve`');
  }
}

// Checks that Firebase has been imported.
checkSetup();

// Shortcuts to DOM Elements.
let itemsListElement = document.getElementById('item-card-container');
let userNameElement = document.getElementById('user-name');
let signInButtonElement = document.getElementById('sign-in');
let signOutButtonElement = document.getElementById('sign-out');
let signInSnackbarElement = document.getElementById('must-signin-snackbar');

signOutButtonElement.addEventListener('click', signOut);
signInButtonElement.addEventListener('click', signIn);


// initialize Firebase
initFirebaseAuth();

// Remove the warning about timstamps change. 
let firestore = firebase.firestore();
let settings = {};
firestore.settings(settings);

// TODO: Enable Firebase Performance Monitoring.

// Load currently existing items and listen for new ones
// only if the user is logged in
loadItems()

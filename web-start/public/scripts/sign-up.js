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

function createUser(email, password, name) {
  firebase.auth().createUserWithEmailAndPassword(email, password).then(() => {
    console.log('Name:', name);
    firebase.auth().currentUser.updateProfile({
      displayName: name
    }).then(function() {
      // Update successful.
      window.location.href = 'index.html';
    }).catch(function(error) {
      // An error happened.
      alert(error.message);
    });
  }).catch((error) => {
    // Handle Errors here.
    let errorCode = error.code;
    let errorMessage = error.message;
    // [START_EXCLUDE]
    if (errorCode == 'auth/weak-password') {
      alert('The password is too weak.');
    } else {
      alert(errorMessage);
    }
    console.log(error);
    // [END_EXCLUDE]
  });
}

// Initiate firebase auth.
function initFirebaseAuth() {
  firebase.auth().onAuthStateChanged(authStateObserver);
}

// Returns true if a user is signed-in.
function isUserSignedIn() {
  return !!firebase.auth().currentUser;
}

// Saves the messaging device token to the datastore.
function saveMessagingDeviceToken() {
  firebase.messaging().getToken().then((currentToken) => {
    if (currentToken) {
      console.log('Got FCM device token:', currentToken);
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

// Returns the signed-in user's display name.
function getUserName() {
  return firebase.auth().currentUser.displayName;
}


// Triggers when the auth state change for instance when the user signs-in or signs-out.
function authStateObserver(user) {
  if (user) { // User is signed in!
    // Get the signed-in user's name.
    let userName = getUserName();

    // Hide sign-in button.
    signInButtonElement.setAttribute('hidden', 'true');

    // We save the Firebase Messaging Device token and enable notifications.
    saveMessagingDeviceToken();
  } else { // User is signed out!

    // Show sign-in button.
    signInButtonElement.removeAttribute('hidden');
  }
}

// Triggered when the user submits the login form
function onFormSubmit(e) {
  e.preventDefault();
  let email = emailElement.value;
  let password = passwordElement.value;
  let displayName = userNameElement.value;
  createUser(email, password, displayName);
}

function validatePassword(){
  if(passwordElement.value != confirmPasswordElement.value) {
    confirmPasswordElement.setCustomValidity("Passwords Don't Match");
  } else {
    confirmPasswordElement.setCustomValidity('');
  }
}


// Checks that the Firebase SDK has been correctly setup and configured.
function checkSetup() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ');
  }
}

// Checks that Firebase has been imported.
checkSetup();

// Shortcuts to DOM Elements.
let emailElement = document.getElementById('email');
let userNameElement = document.getElementById('user-name');
let passwordElement = document.getElementById('password');
let confirmPasswordElement = document.getElementById('retype-password');
let createFormElement = document.getElementById('signup-page');
let signInButtonElement = document.getElementById('sign-in');

// Add event listeners
createFormElement.addEventListener('submit', onFormSubmit);
passwordElement.onchange = validatePassword;
confirmPasswordElement.onkeyup = validatePassword;

// initialize Firebase
initFirebaseAuth();



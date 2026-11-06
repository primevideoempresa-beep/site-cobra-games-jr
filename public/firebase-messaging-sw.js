importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// Note: These values should match your project's configuration.
firebase.initializeApp({
  apiKey: "AIzaSyCu-ikvUJ8Jq2LOFa4i8x4fQtkSspAMdwg",
  authDomain: "jogos-cobra-jr.firebaseapp.com",
  projectId: "jogos-cobra-jr",
  storageBucket: "jogos-cobra-jr.firebasestorage.app",
  messagingSenderId: "1002784007587",
  appId: "1:1002784007587:web:321194b6972a1bdd8d2616"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em segundo plano: ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

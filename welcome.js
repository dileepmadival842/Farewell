const revealVideo = document.getElementById('titleReveal');
const welcomeScreen = document.querySelector('.video-welcome');
const appShell = document.getElementById('appShell');
let hasShownApp = false;

function continueToGame() {
    if (hasShownApp) return;
    hasShownApp = true;
    welcomeScreen?.classList.add('is-leaving');
    appShell?.classList.add('is-ready');
    window.setTimeout(() => welcomeScreen?.remove(), 450);
}

if (revealVideo) {
    revealVideo.addEventListener('ended', continueToGame);
    revealVideo.addEventListener('error', continueToGame);

    // Muted playback is permitted by modern browsers; this safely handles delayed loading.
    revealVideo.play().catch(() => {});
}

window.setTimeout(continueToGame, 5500);

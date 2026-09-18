const body = document.body;
const intro = document.querySelector("#intro");
const entryVideo = document.querySelector("#entryVideo");
const bgMusic = document.querySelector("#bgMusic");
const soundButton = document.querySelector("#sound");
const firstPageVideo = document.querySelector("#firstPageVideo");

/* ============================================================
   1. INTRO VIDEO -> FIRST PAGE   (UNCHANGED)
   ============================================================ */
let introFinished = false;

// Ensure entry video is strictly 100% silent from the start
if (entryVideo) {
  entryVideo.muted = true;
  entryVideo.defaultMuted = true;
  entryVideo.volume = 0;
}

const playFirstPageVideo = () => {
  if (firstPageVideo) {
    firstPageVideo.muted = true;
    firstPageVideo.defaultMuted = true;
    firstPageVideo.volume = 0;

    // Always start fresh when intro is opened
    firstPageVideo.currentTime = 0;

    firstPageVideo.play().catch(() => {});
  }
};

// Start playback / preload early
playFirstPageVideo();

const finishIntro = () => {
  if (introFinished) return;
  introFinished = true;

  intro.classList.add("opened");
  body.classList.remove("locked");

  if (entryVideo) {
    entryVideo.pause();
  }

  playFirstPageVideo();

  // Song starts right after envelope finishes opening
  bgMusic.currentTime = 0;
  bgMusic.volume = 0.55;
  bgMusic.play().catch(() => {
    if (soundButton) soundButton.classList.add("needs-tap");
  });

  // Gentle "there's more below" bounce (see section 6)
  if (typeof window.startScrollHint === "function") window.startScrollHint();
};

const openInvite = () => {
  if (intro.classList.contains("playing")) return;

  intro.classList.add("playing");
  playFirstPageVideo();

  // Ensure zero sound before envelope finishes:
  // Unlock audio permissions silently on user gesture
  bgMusic.pause();
  bgMusic.currentTime = 0;
  const unlockPromise = bgMusic.play();
  if (unlockPromise !== undefined) {
    unlockPromise.then(() => {
      if (!introFinished) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
      }
    }).catch(() => { });
  }

  // Play envelope video WITH sound on tap
  if (entryVideo) {
    entryVideo.muted = false;
    entryVideo.defaultMuted = false;
    entryVideo.volume = 1.0;
    entryVideo.play().catch(() => {
      // Fallback in case browser restricts unmuted playback
      entryVideo.muted = true;
      entryVideo.play().catch(() => { });
    });
  }
};

if (intro) {
  intro.addEventListener("click", openInvite);
  intro.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") openInvite();
  });
}

if (entryVideo) {
  entryVideo.addEventListener("timeupdate", () => {
    if (entryVideo.currentTime >= 2.6 && !introFinished) finishIntro();
  });
  entryVideo.addEventListener("ended", finishIntro);
}

/* NOTE: no auto-scroll after the intro — the page stays where it is
   and the guest scrolls manually. */

/* ============================================================
   2. WEDDING COUNTDOWN (MINIMAL)
   ============================================================ */
const weddingDate = new Date("2026-10-25T18:00:00+05:30").getTime();
let countdownTimerStarted = false;

function startCountdown() {
  if (countdownTimerStarted) return;
  countdownTimerStarted = true;
  const days = document.querySelector("#days");
  const hours = document.querySelector("#hours");
  const minutes = document.querySelector("#minutes");
  const seconds = document.querySelector("#seconds");
  if (!days || !hours || !minutes || !seconds) return;

  const tick = () => {
    const distance = Math.max(0, weddingDate - Date.now());
    const totalSeconds = Math.floor(distance / 1000);
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    days.textContent = String(d).padStart(2, "0");
    hours.textContent = String(h).padStart(2, "0");
    minutes.textContent = String(m).padStart(2, "0");
    seconds.textContent = String(s).padStart(2, "0");
  };

  tick();
  setInterval(tick, 1000);
}

startCountdown();



/* ============================================================
   3. SECTION REVEALS   (fade-in only — not scrolling)
   ============================================================ */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

/* ============================================================
   4. RSVP
   ============================================================ */
const rsvpForm = document.querySelector("#rsvpForm");
if (rsvpForm) {
  rsvpForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = document.querySelector("#formMessage");
    if (msg) msg.textContent = "Thank you — your family details have been noted ♥";
    e.target.reset();
  });
}

/* ============================================================
   5. SOUND TOGGLE
   ============================================================ */
if (soundButton) {
  soundButton.addEventListener("click", () => {
    if (bgMusic.paused) {
      bgMusic.volume = 0.55;
      bgMusic.play().catch(() => { });
      soundButton.textContent = "♫";
      soundButton.classList.remove("needs-tap");
    } else {
      bgMusic.pause();
      soundButton.textContent = "×";
    }
  });
}

/* ============================================================
   6. SCROLL HINT — GENTLE PAGE BOUNCE
   Once the envelope video is over, the page nudges itself
   up and back a couple of times so the guest knows there
   is more below. It is purely visual: the scroll position
   never changes, so nothing is forced on anyone.
   Cancels the moment they scroll, and never runs twice.
   ============================================================ */
(function () {
  let armed = false;
  let done = false;

  const hideCue = () => {
    body.classList.add("cue-done");
  };

  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Cue disappears as soon as the guest starts scrolling on their own.
  window.addEventListener("scroll", () => {
    const y = window.pageYOffset || document.documentElement.scrollTop || 0;
    if (y > 30) {
      done = true;
      hideCue();
    }
  }, { passive: true });

  const glideToFirstSection = () => {
    if (done) return;
    done = true;

    if (firstPageVideo) {
      firstPageVideo.removeEventListener("timeupdate", onTimeUpdate);
    }

    // If they already started scrolling, leave them alone.
    const y = window.pageYOffset || document.documentElement.scrollTop || 0;
    if (y > 30) {
      hideCue();
      return;
    }

    const target = document.querySelector("#functions");
    if (!target) return;

    const top = target.getBoundingClientRect().top + y;

    window.scrollTo({
      top: top,
      behavior: reduceMotion ? "auto" : "smooth"
    });

    hideCue();
  };

  // The first page video loops, so "ended" never fires.
  // Catch the last moment of its first full round.
  function onTimeUpdate() {
    const d = firstPageVideo.duration;
    if (!isFinite(d) || d <= 0) return;

    // Halfway through the video, the cue quietly appears.
    if (!done && firstPageVideo.currentTime >= d / 2) {
      body.classList.add("cue-visible");
    }

    if (firstPageVideo.currentTime >= d - 0.3) glideToFirstSection();
  }

  window.startScrollHint = function () {
    if (armed) return;
    armed = true;

    if (firstPageVideo) {
      firstPageVideo.addEventListener("timeupdate", onTimeUpdate);
    }
  };
})();

/* ============================================================
   WORKING WEDDING COUNTDOWN
   ============================================================ */

(function () {
  const weddingDate =
    new Date("2026-10-25T18:00:00+05:30").getTime();

  function runWeddingCountdown() {
    const daysElement =
      document.getElementById("weddingDays");

    const hoursElement =
      document.getElementById("weddingHours");

    const minutesElement =
      document.getElementById("weddingMinutes");

    const secondsElement =
      document.getElementById("weddingSeconds");

    const countdownElement =
      document.getElementById("weddingCountdown");

    const finishedElement =
      document.getElementById("countdownFinished");

    if (
      !daysElement ||
      !hoursElement ||
      !minutesElement ||
      !secondsElement
    ) {
      console.error("Wedding countdown elements not found.");
      return;
    }

    function updateTimer() {
      const difference = weddingDate - Date.now();

      if (difference <= 0) {
        daysElement.textContent = "00";
        hoursElement.textContent = "00";
        minutesElement.textContent = "00";
        secondsElement.textContent = "00";

        if (countdownElement) {
          countdownElement.style.display = "none";
        }

        if (finishedElement) {
          finishedElement.hidden = false;
        }

        return;
      }

      const days = Math.floor(
        difference / (1000 * 60 * 60 * 24)
      );

      const hours = Math.floor(
        (difference / (1000 * 60 * 60)) % 24
      );

      const minutes = Math.floor(
        (difference / (1000 * 60)) % 60
      );

      const seconds = Math.floor(
        (difference / 1000) % 60
      );

      daysElement.textContent =
        String(days).padStart(2, "0");

      hoursElement.textContent =
        String(hours).padStart(2, "0");

      minutesElement.textContent =
        String(minutes).padStart(2, "0");

      secondsElement.textContent =
        String(seconds).padStart(2, "0");
    }

    updateTimer();
    window.setInterval(updateTimer, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      runWeddingCountdown
    );
  } else {
    runWeddingCountdown();
  }
})();
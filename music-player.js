/**
 * Jessica Portfolio - Persistent Global Music Player
 * Biru Galaksi Cerah & Aesthetic Theme
 * Playback persistence across page navigation using localStorage state sync.
 */

(function () {
    // Detect folder depth to resolve relative MP3 paths
    const currentPath = window.location.pathname.replace(/\\/g, '/');
    const isSubfolder = currentPath.includes('/informatika/');
    const pathPrefix = isSubfolder ? '../' : '';

    // Full MP3 Playlist Definition
    const PLAYLIST = [
        {
            id: 0,
            title: "Cause You Have To",
            artist: "LANY",
            file: pathPrefix + "LANY - Cause You Have To.mp3",
            badge: "LANY Full Track 🎧",
            icon: "🎧"
        },
        {
            id: 1,
            title: "Malibu Nights",
            artist: "LANY",
            file: pathPrefix + "LANY - Malibu Nights.mp3",
            badge: "Hit Single 🌙",
            icon: "🌙"
        },
        {
            id: 2,
            title: "Super Far",
            artist: "LANY",
            file: pathPrefix + "LANY - Super Far.mp3",
            badge: "Pop Classic 🍓",
            icon: "🍓"
        },
        {
            id: 3,
            title: "Sialan",
            artist: "Adrian Khalif & Juicy Luicy",
            file: pathPrefix + "Adrian Khalif Juicy Luicy - Sialan.mp3",
            badge: "Indo Pop 🎸",
            icon: "🎸"
        }
    ];

    let audio = null;
    let currentTrackIndex = 0;
    let isUserSeeking = false;

    // Load initial state from localStorage
    function getSavedState() {
        const savedIndex = parseInt(localStorage.getItem('jessica_audio_track_index') || '0', 10);
        const validIndex = (!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < PLAYLIST.length) ? savedIndex : 0;
        const savedTime = parseFloat(localStorage.getItem('jessica_audio_time') || '0');
        const isPlaying = localStorage.getItem('jessica_audio_playing') === 'true';
        const savedVolume = parseFloat(localStorage.getItem('jessica_audio_volume') || '0.9');
        const isMuted = localStorage.getItem('jessica_audio_muted') === 'true';
        const isLoop = localStorage.getItem('jessica_audio_loop') === 'true';
        const savedTimestamp = parseInt(localStorage.getItem('jessica_audio_timestamp') || '0', 10);

        return {
            trackIndex: validIndex,
            time: isNaN(savedTime) ? 0 : savedTime,
            isPlaying: isPlaying,
            volume: isNaN(savedVolume) ? 0.9 : savedVolume,
            isMuted: isMuted,
            isLoop: isLoop,
            timestamp: savedTimestamp
        };
    }

    function saveState() {
        if (!audio) return;
        localStorage.setItem('jessica_audio_track_index', currentTrackIndex.toString());
        localStorage.setItem('jessica_audio_time', audio.currentTime.toString());
        localStorage.setItem('jessica_audio_playing', !audio.paused ? 'true' : 'false');
        localStorage.setItem('jessica_audio_volume', audio.volume.toString());
        localStorage.setItem('jessica_audio_muted', audio.muted ? 'true' : 'false');
        localStorage.setItem('jessica_audio_loop', audio.loop ? 'true' : 'false');
        localStorage.setItem('jessica_audio_timestamp', Date.now().toString());
    }

    function initAudioPlayer() {
        // Retrieve or create global audio element
        audio = document.getElementById('full-audio-player');
        if (!audio) {
            audio = document.createElement('audio');
            audio.id = 'full-audio-player';
            audio.preload = 'metadata';
            document.body.appendChild(audio);
        }

        const state = getSavedState();
        currentTrackIndex = state.trackIndex;

        audio.volume = state.volume;
        audio.muted = state.isMuted;
        audio.loop = state.isLoop;

        const currentTrack = PLAYLIST[currentTrackIndex];
        audio.src = currentTrack.file;

        // Calculate time offset if audio was playing during page switch
        let restoreTime = state.time;
        if (state.isPlaying && state.timestamp > 0) {
            const elapsed = (Date.now() - state.timestamp) / 1000;
            if (elapsed > 0 && elapsed < 30) {
                restoreTime += elapsed;
            }
        }

        audio.addEventListener('loadedmetadata', () => {
            if (restoreTime > 0 && restoreTime < audio.duration) {
                audio.currentTime = restoreTime;
            }
            updateDurationUI();
        });

        // Throttle saving state to localStorage
        let lastSave = 0;
        audio.addEventListener('timeupdate', () => {
            const now = Date.now();
            if (now - lastSave > 400) {
                saveState();
                lastSave = now;
            }
            updateProgressUI();
        });

        audio.addEventListener('play', () => {
            saveState();
            updatePlayStateUI(true);
        });

        audio.addEventListener('pause', () => {
            saveState();
            updatePlayStateUI(false);
        });

        audio.addEventListener('ended', () => {
            if (!audio.loop) {
                changeTrackRelative(1, true);
            }
        });

        // Inject floating mini player widget UI into document
        injectFloatingMiniPlayerUI();
        updateTrackInfoUI();
        updatePlayStateUI(!audio.paused);

        // Auto-resume audio if it was active
        if (state.isPlaying) {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    updatePlayStateUI(true);
                }).catch(err => {
                    console.log("Autoplay deferred by browser policy. Will resume on first user interaction.", err);
                    updatePlayStateUI(false);
                    setupResumeOnInteraction();
                });
            }
        }

        // Intercept internal page links to save audio state immediately before unloading
        document.querySelectorAll('a[href]').forEach(link => {
            link.addEventListener('click', (e) => {
                saveState();
            });
        });

        window.addEventListener('beforeunload', () => {
            saveState();
        });
    }

    function setupResumeOnInteraction() {
        const resumeHandler = () => {
            if (audio && audio.paused && localStorage.getItem('jessica_audio_playing') === 'true') {
                audio.play().then(() => {
                    updatePlayStateUI(true);
                }).catch(() => {});
            }
            window.removeEventListener('click', resumeHandler);
            window.removeEventListener('keydown', resumeHandler);
            window.removeEventListener('touchstart', resumeHandler);
        };
        window.addEventListener('click', resumeHandler, { once: true });
        window.addEventListener('keydown', resumeHandler, { once: true });
        window.addEventListener('touchstart', resumeHandler, { once: true });
    }

    function injectFloatingMiniPlayerUI() {
        if (document.getElementById('floating-mini-player')) return;

        const container = document.createElement('div');
        container.id = 'floating-mini-player';
        container.className = 'fixed bottom-5 right-5 z-50 transition-all duration-500 ease-out pointer-events-auto';
        container.innerHTML = `
            <div class="bg-slate-950/90 backdrop-blur-md border border-sky-500/40 p-3 sm:p-3.5 rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.9)] flex items-center gap-3 max-w-sm">
                <!-- Cover Vinyl / Emoji -->
                <div class="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 p-0.5 shadow-[0_0_12px_rgba(56,189,248,0.5)] shrink-0 overflow-hidden flex items-center justify-center">
                    <span id="mini-cover-emoji" class="text-lg animate-pulse">🎧</span>
                    <div id="mini-vinyl-spin" class="absolute inset-0 rounded-full border border-sky-300/30 opacity-70 pointer-events-none"></div>
                </div>

                <!-- Track Controls -->
                <button onclick="window.JessicaMusicPlayer.prevTrack()" title="Lagu Sebelumnya" class="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-bold p-1">
                    ⏮️
                </button>

                <button onclick="window.JessicaMusicPlayer.togglePlay()" title="Putar / Jeda" class="w-9 h-9 rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-slate-950 flex items-center justify-center shrink-0 hover:scale-105 transition-transform shadow-[0_0_15px_rgba(56,189,248,0.6)] cursor-pointer">
                    <svg id="mini-play-icon" class="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <svg id="mini-pause-icon" class="w-4 h-4 fill-current hidden" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>

                <button onclick="window.JessicaMusicPlayer.nextTrack()" title="Lagu Selanjutnya" class="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-bold p-1">
                    ⏭️
                </button>

                <!-- Track Info -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                        <span id="mini-live-dot" class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <p id="mini-player-title" class="text-xs font-bold text-white truncate">Cause You Have To</p>
                    </div>
                    <p id="mini-player-artist" class="text-[10px] text-sky-300 font-medium truncate">LANY — Full MP3 Audio</p>
                </div>

                <!-- Action Button -->
                <button onclick="window.JessicaMusicPlayer.scrollToMainPlayer()" title="Buka Player Utama" class="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[11px] font-bold rounded-lg border border-sky-400/40 transition-colors cursor-pointer shrink-0 flex items-center gap-1">
                    <span>🎵</span> <span class="hidden sm:inline">Player</span>
                </button>
            </div>
        `;

        document.body.appendChild(container);
    }

    function updateTrackInfoUI() {
        const song = PLAYLIST[currentTrackIndex];
        if (!song) return;

        const songTitle = document.getElementById('mp3-song-title');
        const songArtist = document.getElementById('mp3-song-artist');
        const songBadge = document.getElementById('mp3-song-badge');
        const coverEmoji = document.getElementById('mp3-cover-emoji');
        const miniTitle = document.getElementById('mini-player-title');
        const miniArtist = document.getElementById('mini-player-artist');
        const miniCover = document.getElementById('mini-cover-emoji');

        if (songTitle) songTitle.textContent = song.title;
        if (songArtist) songArtist.textContent = song.artist + " — Official Full Track";
        if (songBadge) songBadge.textContent = song.badge;
        if (coverEmoji) coverEmoji.textContent = song.icon;
        if (miniTitle) miniTitle.textContent = song.title;
        if (miniArtist) miniArtist.textContent = `${song.artist} — Full MP3`;
        if (miniCover) miniCover.textContent = song.icon;

        // Highlight playlist buttons in inline full player
        PLAYLIST.forEach((item, idx) => {
            const btn = document.getElementById(`mp3-track-btn-${idx}`);
            if (btn) {
                if (idx === currentTrackIndex) {
                    btn.className = "mp3-track-btn px-3.5 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-lg border border-sky-400/50 transition-all cursor-pointer flex items-center gap-2 scale-105";
                    btn.innerHTML = `<span>${item.icon} ${idx + 1}. ${item.title} (${item.artist})</span><span class="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-md uppercase font-extrabold">Aktif 🎵</span>`;
                } else {
                    btn.className = "mp3-track-btn px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-800 transition-all cursor-pointer flex items-center gap-2";
                    btn.innerHTML = `<span>${item.icon} ${idx + 1}. ${item.title} (${item.artist})</span>`;
                }
            }
        });
    }

    function updatePlayStateUI(isPlaying) {
        const playIcon = document.getElementById('play-icon-svg');
        const pauseIcon = document.getElementById('pause-icon-svg');
        const playBtnLabel = document.getElementById('play-btn-label');
        const miniPlayIcon = document.getElementById('mini-play-icon');
        const miniPauseIcon = document.getElementById('mini-pause-icon');
        const liveBadge = document.getElementById('audio-live-badge');
        const vinylDisc = document.getElementById('vinyl-disc-icon');
        const miniVinylSpin = document.getElementById('mini-vinyl-spin');
        const statusText = document.getElementById('audio-status-text');
        const visualizerBars = document.querySelectorAll('#visualizer-bars .bar');
        const miniLiveDot = document.getElementById('mini-live-dot');

        if (isPlaying) {
            if (playIcon) playIcon.classList.add('hidden');
            if (pauseIcon) pauseIcon.classList.remove('hidden');
            if (playBtnLabel) playBtnLabel.textContent = "Jeda Musik";
            if (miniPlayIcon) miniPlayIcon.classList.add('hidden');
            if (miniPauseIcon) miniPauseIcon.classList.remove('hidden');
            if (liveBadge) liveBadge.classList.remove('hidden');
            if (vinylDisc) vinylDisc.classList.add('animate-spin');
            if (miniVinylSpin) miniVinylSpin.classList.add('animate-spin');
            if (statusText) statusText.textContent = "Sedang Diputar 🎵";
            if (miniLiveDot) miniLiveDot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
            visualizerBars.forEach(bar => bar.classList.add('animate-bounce'));
        } else {
            if (playIcon) playIcon.classList.remove('hidden');
            if (pauseIcon) pauseIcon.classList.add('hidden');
            if (playBtnLabel) playBtnLabel.textContent = "Putar Full Music";
            if (miniPlayIcon) miniPlayIcon.classList.remove('hidden');
            if (miniPauseIcon) miniPauseIcon.classList.add('hidden');
            if (liveBadge) liveBadge.classList.add('hidden');
            if (vinylDisc) vinylDisc.classList.remove('animate-spin');
            if (miniVinylSpin) miniVinylSpin.classList.remove('animate-spin');
            if (statusText) statusText.textContent = "Di-jeda";
            if (miniLiveDot) miniLiveDot.className = "w-2 h-2 rounded-full bg-amber-400";
            visualizerBars.forEach(bar => bar.classList.remove('animate-bounce'));
        }
    }

    function updateProgressUI() {
        if (!audio) return;
        const seekSlider = document.getElementById('audio-seek-slider');
        const currentTimeEl = document.getElementById('audio-current-time');

        if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
        if (seekSlider && !isUserSeeking && audio.duration) {
            seekSlider.value = (audio.currentTime / audio.duration) * 100;
        }
    }

    function updateDurationUI() {
        if (!audio) return;
        const durationEl = document.getElementById('audio-duration');
        if (durationEl && !isNaN(audio.duration)) {
            durationEl.textContent = formatTime(audio.duration);
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function togglePlay() {
        if (!audio) return;
        if (audio.paused) {
            audio.play().then(() => {
                updatePlayStateUI(true);
            }).catch(err => {
                console.error("Playback error:", err);
            });
        } else {
            audio.pause();
            updatePlayStateUI(false);
        }
    }

    function changeTrack(index, autoPlay = true) {
        if (index < 0 || index >= PLAYLIST.length) return;
        currentTrackIndex = index;
        const song = PLAYLIST[index];

        audio.src = song.file;
        audio.load();
        updateTrackInfoUI();

        if (autoPlay) {
            audio.play().then(() => {
                updatePlayStateUI(true);
            }).catch(err => {
                console.log("Audio play deferred:", err);
                updatePlayStateUI(false);
            });
        } else {
            updatePlayStateUI(false);
        }
        saveState();
    }

    function changeTrackRelative(direction, autoPlay = true) {
        let newIndex = (currentTrackIndex + direction + PLAYLIST.length) % PLAYLIST.length;
        changeTrack(newIndex, autoPlay);
    }

    function seekRelative(seconds) {
        if (audio) {
            audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
            saveState();
        }
    }

    function seekToPercentage(percentage) {
        if (audio && audio.duration) {
            audio.currentTime = (percentage / 100) * audio.duration;
            saveState();
        }
    }

    function setVolume(volumeVal) {
        if (!audio) return;
        audio.volume = volumeVal;
        audio.muted = (volumeVal === 0);
        updateVolumeUI(audio.volume, audio.muted);
        saveState();
    }

    function toggleMute() {
        if (!audio) return;
        audio.muted = !audio.muted;
        const volumeSlider = document.getElementById('audio-volume-slider');
        if (volumeSlider) {
            volumeSlider.value = audio.muted ? 0 : audio.volume;
        }
        updateVolumeUI(audio.volume, audio.muted);
        saveState();
    }

    function updateVolumeUI(volume, muted) {
        const iconHigh = document.getElementById('volume-icon-high');
        const iconMuted = document.getElementById('volume-icon-muted');
        if (muted || volume === 0) {
            if (iconHigh) iconHigh.classList.add('hidden');
            if (iconMuted) iconMuted.classList.remove('hidden');
        } else {
            if (iconHigh) iconHigh.classList.remove('hidden');
            if (iconMuted) iconMuted.classList.add('hidden');
        }
    }

    function toggleLoop() {
        if (!audio) return;
        audio.loop = !audio.loop;
        const loopBtn = document.getElementById('audio-loop-btn');
        if (loopBtn) {
            if (audio.loop) {
                loopBtn.className = "p-2.5 rounded-xl bg-sky-500/20 border border-sky-500 text-sky-400 transition-all cursor-pointer shadow-[0_0_10px_rgba(56,189,248,0.4)]";
            } else {
                loopBtn.className = "p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-sky-400 transition-all cursor-pointer";
            }
        }
        saveState();
    }

    function scrollToMainPlayer() {
        const mp3View = document.getElementById('full-mp3-player-view');
        if (mp3View) {
            mp3View.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            // Navigate to index.html#music-section if main player is not on current page
            const targetUrl = pathPrefix ? pathPrefix + 'index.html#music-section' : 'index.html#music-section';
            window.location.href = targetUrl;
        }
    }

    // Bind event listeners to DOM controls if present on page
    function bindDOMControls() {
        const seekSlider = document.getElementById('audio-seek-slider');
        const volumeSlider = document.getElementById('audio-volume-slider');

        if (seekSlider) {
            seekSlider.addEventListener('input', () => {
                isUserSeeking = true;
            });
            seekSlider.addEventListener('change', () => {
                seekToPercentage(seekSlider.value);
                isUserSeeking = false;
            });
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                setVolume(parseFloat(e.target.value));
            });
        }
    }

    // Initialize on DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initAudioPlayer();
            bindDOMControls();
        });
    } else {
        initAudioPlayer();
        bindDOMControls();
    }

    // Expose global controller interface for inline onclick bindings across HTML files
    window.JessicaMusicPlayer = {
        togglePlay: togglePlay,
        nextTrack: () => changeTrackRelative(1, true),
        prevTrack: () => changeTrackRelative(-1, true),
        changeTrack: changeTrack,
        seekRelative: seekRelative,
        seekToPercentage: seekToPercentage,
        setVolume: setVolume,
        toggleMute: toggleMute,
        toggleLoop: toggleLoop,
        scrollToMainPlayer: scrollToMainPlayer,
        getAudio: () => audio,
        getCurrentTrack: () => PLAYLIST[currentTrackIndex]
    };

    // Backward-compatibility wrapper aliases for pre-existing inline onclick handlers
    window.toggleFullAudio = togglePlay;
    window.changeLocalTrack = changeTrack;
    window.changeLocalTrackRelative = changeTrackRelative;
    window.seekAudioRelative = seekRelative;
    window.toggleAudioMute = toggleMute;
    window.toggleAudioLoop = toggleLoop;
    window.scrollPlayerIntoView = scrollToMainPlayer;
})();

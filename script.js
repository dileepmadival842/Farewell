(function() {
            // ---------- 45 people ----------
            const names = [
                "Emma Watson", "Liam Neeson", "Scarlett Johansson", "Dwayne Johnson", "Taylor Swift",
                "Chris Evans", "Zendaya", "Tom Holland", "Ariana Grande", "Ryan Reynolds",
                "Natalie Portman", "Robert Downey", "Selena Gomez", "Chris Hemsworth", "Margot Robbie",
                "Leonardo DiCaprio", "Jennifer Lawrence", "Timothee Chalamet", "Gal Gadot", "Henry Cavill",
                "Anne Hathaway", "Will Smith", "Angelina Jolie", "Brad Pitt", "Cate Blanchett",
                "Keanu Reeves", "Meryl Streep", "Denzel Washington", "Julia Roberts", "Morgan Freeman",
                "Hugh Jackman", "Nicole Kidman", "Tom Cruise", "Sandra Bullock", "Johnny Depp",
                "Al Pacino", "Robert De Niro", "Jodie Foster", "Matt Damon", "Christian Bale",
                "Amy Adams", "Jake Gyllenhaal", "Reese Witherspoon", "Mark Ruffalo", "Charlize Theron"
            ];
            const avatarColors = [
                "#ffd166", "#ef476f", "#06d6a0", "#118ab2", "#f78c6b",
                "#9b5de5", "#00bbf9", "#f15bb5", "#fee440", "#00f5d4",
                "#ff9f1c", "#2ec4b6", "#e71d36", "#7bdff2", "#b2f7ef",
                "#ff70a6", "#70d6ff", "#ff9770", "#caffbf", "#a0c4ff",
                "#bdb2ff", "#ffc6ff", "#fdffb6", "#8ac926", "#ff595e",
                "#1982c4", "#c77dff", "#4cc9f0", "#f72585", "#b517ff",
                "#3a86ff", "#ffbe0b", "#fb5607", "#52b788", "#64dfdf",
                "#f94144", "#f3722c", "#f8961e", "#90be6d", "#277da1",
                "#c77dff", "#80ffdb", "#ffcad4", "#b8f2e6", "#ffd6a5"
            ];

            function autoColorForNumber(number) {
                const index = Math.abs((Number(number) || 1) - 1) % avatarColors.length;
                return avatarColors[index];
            }

            const people = Array.from({ length: 45 }, (_, i) => ({
                number: i + 1,
                name: names[i] || `Guest ${i+1}`,
                color: autoColorForNumber(i + 1),
                image_url: "",
                role: "",
                note: ""
            }));

            // ---------- state ----------
            const pickedSet = new Set();
            const pickedList = [];
            const savedPeople = [];
            const savedRounds = [];
            let selectedGame = null;
            let availableGames = [];
            let isGameRevealVisible = false;
            let isGameTimerVisible = false;
            let isGameTimerRunning = false;
            let gameTimerDurationSeconds = 60;
            let gameTimerRemainingSeconds = 60;
            let gameTimerInterval = null;
            let currentAngle = 0;
            let isSpinning = false;
            let currentPerson = null;
            let lastTargetNumber = null;

            const ROUND_SIZE = 5;
            let roundPicks = [];

            const gameOptions = [
                { id: 'musical-chair', name: 'Musical Chair', image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=900&q=80', has_enter: false },
                { id: 'treasure-hunt', name: 'Treasure Hunt', image_url: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80', has_enter: false },
                { id: 'dumb-charades', name: 'Dumb Charades', image_url: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=900&q=80', has_enter: false },
                { id: 'balloon-pop', name: 'Balloon Pop', image_url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=80', has_enter: false },
                { id: 'quiz-battle', name: 'Quiz Battle', image_url: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=900&q=80', has_enter: false },
                { id: 'paper-dance', name: 'Paper Dance', image_url: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?auto=format&fit=crop&w=900&q=80', has_enter: false },
                { id: 'memory-game', name: 'Memory Game', image_url: 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?auto=format&fit=crop&w=900&q=80', has_enter: false },
                { id: 'rapid-fire', name: 'Rapid Fire', image_url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=900&q=80', has_enter: false },
                { id: 'blindfold-challenge', name: 'Blindfold Challenge', image_url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80', has_enter: false },
                { id: 'minute-to-win-it', name: 'Minute To Win It', image_url: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=900&q=80', has_enter: false }
            ];

            let audioCtx = null;
            let isAudioEnabled = true;
            let supabaseClient = null;
            let supabaseReady = false;
            let wheelStateChannel = null;
            let spinCommandChannel = null;
            let pendingRemoteState = null;
            let latestCloudState = null;
            let scheduledSpinTimeout = null;
            let lastAppliedActionId = null;
            let activeSpinToken = 0;
            const clientInstanceId = window.crypto?.randomUUID
                ? window.crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const processedSpinCommands = new Set();

            const supabaseConfig = window.FAREWELL_SUPABASE_CONFIG || {};
            const SUPABASE_URL = supabaseConfig.url || '';
            const SUPABASE_ANON_KEY = supabaseConfig.anonKey || '';
            const PEOPLE_TABLE = supabaseConfig.peopleTable || 'people';

            function isSupabaseConfigured() {
                return typeof SUPABASE_URL === 'string' &&
                    SUPABASE_URL.includes('supabase.co') &&
                    typeof SUPABASE_ANON_KEY === 'string' &&
                    SUPABASE_ANON_KEY.length > 10 &&
                    !SUPABASE_URL.includes('YOUR_PROJECT_REF');
            }

            function initializeSupabaseClient() {
                if (!isSupabaseConfigured() || !window.supabase) return null;
                if (!supabaseClient) {
                    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                }
                return supabaseClient;
            }

            function escapeHtml(value) {
                return String(value || '').replace(/[&<>"']/g, (char) => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                }[char]));
            }

            function normalizeTimerSeconds(value) {
                const seconds = Number(value);
                if (!Number.isFinite(seconds) || seconds < 1) return 60;
                return Math.min(359999, Math.floor(seconds));
            }

            function normalizeGame(game) {
                if (!game || !game.id) return null;
                const match = [...availableGames, ...gameOptions].find((item) => item.id === game.id);
                return {
                    id: String(game.id),
                    name: String(game.name || match?.name || 'Selected Game'),
                    image_url: String(game.image_url || match?.image_url || ''),
                    has_enter: Boolean(game.has_enter ?? match?.has_enter),
                    enter_timer_seconds: normalizeTimerSeconds(game.enter_timer_seconds ?? match?.enter_timer_seconds),
                    details: String(game.details || match?.details || ''),
                    requirements: String(game.requirements || match?.requirements || '')
                };
            }

            function normalizeGameList(games) {
                return Array.isArray(games)
                    ? games
                        .filter((game) => game?.id && game?.name)
                        .map((game) => ({
                            id: String(game.id),
                            name: String(game.name),
                            image_url: String(game.image_url || ''),
                            has_enter: Boolean(game.has_enter),
                            enter_timer_seconds: normalizeTimerSeconds(game.enter_timer_seconds),
                            details: String(game.details || ''),
                            requirements: String(game.requirements || '')
                        }))
                    : [];
            }

            function resolveSelectedGameForPersistence(state) {
                const hasCloudSelectedGame = Object.prototype.hasOwnProperty.call(state || {}, 'selectedGame');
                const cloudSelectedGame = normalizeGame(state?.selectedGame);
                if (hasCloudSelectedGame) {
                    return cloudSelectedGame ? { ...cloudSelectedGame } : null;
                }
                return selectedGame ? { ...selectedGame } : null;
            }

            function applyGameState(state) {
                const previousGameId = selectedGame?.id || null;
                availableGames = normalizeGameList(state?.games);
                selectedGame = normalizeGame(state?.selectedGame);
                const gameChanged = (selectedGame?.id || null) !== previousGameId;
                if (gameChanged || !shouldShowEnterButton(selectedGame)) {
                    stopGameTimer();
                    isGameTimerVisible = false;
                }
                latestCloudState = state || null;
                renderGameReveal();
            }

            function getAvatarMarkup(person, className) {
                if (person.image_url) {
                    return `<img class="${className} person-photo" src="${escapeHtml(person.image_url)}" alt="${escapeHtml(person.name)}" loading="lazy" />`;
                }
                return `<div class="${className}" data-color="${escapeHtml(person.color)}">${escapeHtml(person.name.charAt(0).toUpperCase())}</div>`;
            }

            async function loadPeopleFromSupabase() {
                const client = initializeSupabaseClient();
                if (!client) return 0;

                try {
                    const { data, error } = await client
                        .from(PEOPLE_TABLE)
                        .select('number, name, role, note, color, image_url')
                        .order('number', { ascending: true });

                    if (error) {
                        console.warn('Supabase people load error:', error.message);
                        showToast(`People fetch failed: ${error.message}`);
                        return 0;
                    }

                    if (!Array.isArray(data) || data.length === 0) return 0;

                    let loadedCount = 0;
                    data.forEach((person) => {
                        const index = Number(person.number) - 1;
                        if (index < 0 || index >= people.length) return;
                        people[index] = {
                            ...people[index],
                            number: Number(person.number),
                            name: person.name || people[index].name,
                            role: person.role || "",
                            note: person.note || "",
                            color: autoColorForNumber(person.number),
                            image_url: person.image_url || ""
                        };
                        loadedCount += 1;
                    });

                    return loadedCount;
                } catch (error) {
                    console.warn('Supabase people load failed:', error);
                    showToast(`People fetch failed: ${error.message || 'network error'}`);
                    return 0;
                }
            }

            function applyPersistedState(state) {
                if (!state) return;
                latestCloudState = state;

                pickedSet.clear();
                pickedList.length = 0;
                savedPeople.length = 0;
                savedRounds.length = 0;
                roundPicks = [];
                currentPerson = null;
                lastTargetNumber = null;

                if (Array.isArray(state.pickedNumbers)) {
                    state.pickedNumbers.forEach((number) => pickedSet.add(number));
                }
                if (Array.isArray(state.pickedList)) {
                    state.pickedList.forEach((person) => pickedList.push({ ...person }));
                }
                if (Array.isArray(state.savedPeople)) {
                    state.savedPeople.forEach((person) => savedPeople.push({ ...person }));
                }
                if (Array.isArray(state.savedRounds)) {
                    state.savedRounds.forEach((round) => {
                        if (Array.isArray(round) && round.length > 0) {
                            savedRounds.push(round.map((person) => ({ ...person })));
                        }
                    });
                } else if (savedPeople.length > 0) {
                    for (let i = 0; i < savedPeople.length; i += ROUND_SIZE) {
                        savedRounds.push(savedPeople.slice(i, i + ROUND_SIZE).map((person) => ({ ...person })));
                    }
                }
                if (Array.isArray(state.roundPicks)) {
                    roundPicks = state.roundPicks.map((person) => ({ ...person }));
                }
                applyGameState(state);
                if (state.currentPerson) {
                    currentPerson = { ...state.currentPerson };
                }
                if (typeof state.lastTargetNumber === 'number') {
                    lastTargetNumber = state.lastTargetNumber;
                }
                if (typeof state.currentAngle === 'number') {
                    currentAngle = state.currentAngle;
                }
                if (state.lastAction?.id) {
                    lastAppliedActionId = state.lastAction.id;
                }

                drawWheel(currentAngle);
                updateDisplays();
                syncSharedUi();
            }

            function resetLocalState() {
                activeSpinToken += 1;
                latestCloudState = null;
                pickedSet.clear();
                pickedList.length = 0;
                savedPeople.length = 0;
                savedRounds.length = 0;
                roundPicks = [];
                currentPerson = null;
                lastTargetNumber = null;
                isGameRevealVisible = false;
                isSpinning = false;
                currentAngle = 0;
                drawWheel(0);
                updateDisplays();
                updateSpinButtonState();
                overlay.classList.remove('active');
                overlayImage.hidden = true;
                overlayImage.removeAttribute('src');
                overlayInitial.hidden = false;
                updateSpeedBar(0);
                hideRoundCompleteOverlay();
                renderGameReveal();
            }

            function applyRemoteState(state) {
                const actionType = state?.lastAction?.type || '';
                const isGameAction = actionType.startsWith('game-');
                const shouldWaitForSpin = isSpinning && (!actionType || actionType === 'spin-result');

                if (shouldWaitForSpin) {
                    pendingRemoteState = state || {};
                    return;
                }

                if (isSpinning && isGameAction) {
                    latestCloudState = state || null;
                    applyGameState(state);
                    return;
                }

                if (isGameAction) {
                    latestCloudState = state || null;
                    applyGameState(state);
                    pendingRemoteState = null;
                    return;
                }

                if (isSpinning) {
                    activeSpinToken += 1;
                    isSpinning = false;
                    updateSpinButtonState();
                    overlay.classList.remove('active');
                    updateSpeedBar(0);
                }

                if (state) {
                    applyPersistedState(state);
                } else {
                    latestCloudState = null;
                    resetLocalState();
                }

                pendingRemoteState = null;
            }

            function flushPendingRemoteState() {
                if (!pendingRemoteState || isSpinning) return;
                applyRemoteState(Object.keys(pendingRemoteState).length ? pendingRemoteState : null);
            }

            async function loadPersistedState() {
                const client = initializeSupabaseClient();
                if (!client) {
                    return false;
                }

                try {
                    const { data, error } = await client
                        .from('wheel_state')
                        .select('data')
                        .eq('id', 'main')
                        .maybeSingle();

                    if (error) {
                        if (error.code !== 'PGRST116') {
                            console.warn('Supabase load error:', error.message);
                        }
                        return false;
                    }

                    if (data?.data) {
                        latestCloudState = data.data;
                        applyPersistedState(data.data);
                        showToast('Loaded saved wheel state.');
                    }
                    return true;
                } catch (error) {
                    console.warn('Supabase load failed:', error);
                    return false;
                }
            }

            async function loadLatestCloudState() {
                const client = initializeSupabaseClient();
                if (!client) return null;

                const { data, error } = await client
                    .from('wheel_state')
                    .select('data')
                    .eq('id', 'main')
                    .maybeSingle();

                if (error) {
                    console.warn('Supabase state refresh failed:', error.message);
                    return latestCloudState;
                }

                latestCloudState = data?.data || null;
                return latestCloudState;
            }

            async function refreshGameStateFromCloud() {
                const state = await loadLatestCloudState();
                if (state) {
                    applyGameState(state);
                }
                return selectedGame;
            }

            async function persistState(actionType = 'state-updated', details = {}) {
                const client = initializeSupabaseClient();
                if (!client) return;

                try {
                    const cloudState = await loadLatestCloudState();
                    const gameState = cloudState || latestCloudState || {};
                    const nextSelectedGame = resolveSelectedGameForPersistence(gameState);
                    const nextData = {
                        pickedNumbers: Array.from(pickedSet),
                        pickedList: pickedList.map((person) => ({ ...person })),
                        savedPeople: savedPeople.map((person) => ({ ...person })),
                        savedRounds: savedRounds.map((round) => round.map((person) => ({ ...person }))),
                        roundPicks: roundPicks.map((person) => ({ ...person })),
                        games: Array.isArray(gameState.games)
                            ? gameState.games.map((game) => ({ ...game }))
                            : availableGames.map((game) => ({ ...game })),
                        selectedGame: nextSelectedGame,
                        removedGameIds: Array.isArray(gameState.removedGameIds)
                            ? gameState.removedGameIds.map(String)
                            : [],
                        currentAngle,
                        currentPerson: currentPerson ? { ...currentPerson } : null,
                        lastTargetNumber,
                        lastAction: {
                            id: `${clientInstanceId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                            type: actionType,
                            source: clientInstanceId,
                            at: Date.now(),
                            details
                        }
                    };
                    applyGameState(nextData);
                    latestCloudState = nextData;

                    await client.from('wheel_state').upsert({
                        id: 'main',
                        updated_at: new Date().toISOString(),
                        data: nextData
                    }, { onConflict: 'id' });
                } catch (error) {
                    console.warn('Supabase save failed:', error);
                }
            }

            function subscribeToWheelState() {
                const client = initializeSupabaseClient();
                if (!client || wheelStateChannel) return;

                wheelStateChannel = client
                    .channel('wheel-state-live')
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'wheel_state',
                            filter: 'id=eq.main'
                        },
                        (payload) => {
                            if (payload.eventType === 'DELETE') {
                                applyRemoteState(null);
                                return;
                            }

                            applyRemoteState(payload.new?.data || null);
                        }
                    )
                    .subscribe((status) => {
                        if (status === 'SUBSCRIBED') {
                            console.info('Realtime wheel sync connected.');
                        }
                    });
            }

            function subscribeToSpinCommands() {
                const client = initializeSupabaseClient();
                if (!client || spinCommandChannel) return;

                spinCommandChannel = client
                    .channel('spin-command-live')
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'spin_commands'
                        },
                        (payload) => {
                            handleSpinCommand(payload.new);
                        }
                    )
                    .subscribe((status) => {
                        if (status === 'SUBSCRIBED') {
                            console.info('Realtime spin remote connected.');
                        }
                    });
            }

            // DOM refs
            const canvas = document.getElementById('wheelCanvas');
            const ctx = canvas.getContext('2d');
            const spinBtn = document.getElementById('spinBtn');
            const clearBtn = document.getElementById('clearBtn');
            const pickedCountEl = document.getElementById('pickedCount');
            const leftCountEl = document.getElementById('leftCount');
            const roundResults = document.getElementById('roundResults');
            const roundBadge = document.getElementById('roundBadge');
            const historyGrid = document.getElementById('historyGrid');
            const nextBtn = document.getElementById('nextBtn');
            const savedGrid = document.getElementById('savedGrid');
            const gameRevealSection = document.getElementById('gameRevealSection');
            const gameRevealCard = document.getElementById('gameRevealCard');
            const gameFullscreenOverlay = document.getElementById('gameFullscreenOverlay');
            const gameFullscreenCard = document.getElementById('gameFullscreenCard');
            const toast = document.getElementById('toast');
            const speedBar = document.getElementById('speedBar');

            const overlay = document.getElementById('wheelOverlay');
            const bigNumberEl = document.getElementById('bigNumber');
            const overlayAvatar = document.getElementById('overlayAvatar');
            const overlayImage = document.getElementById('overlayImage');
            const overlayInitial = document.getElementById('overlayInitial');
            const overlayName = document.getElementById('overlayName');
            const overlayNumber = document.getElementById('overlayNumber');
            const overlayRole = document.getElementById('overlayRole');
            const overlayNote = document.getElementById('overlayNote');
            const roundCompleteOverlay = document.getElementById('roundCompleteOverlay');
            const roundCompleteGrid = document.getElementById('roundCompleteGrid');
            const roundCompleteNext = document.getElementById('roundCompleteNext');

            const NUM_SEGMENTS = 45;
            const PI = Math.PI;
            const TAU = 2 * PI;
            const segmentAngle = TAU / NUM_SEGMENTS;
            const MIN_SPIN_ROTATIONS = 5;
            const SPIN_DURATION_MS = 5000;
            const OVERLAY_HOLD_MS = 5000;

            // ---------- Audio ----------
            function initAudio() {
                try {
                    audioCtx = new(window.AudioContext || window.webkitAudioContext)();
                } catch (e) {
                    audioCtx = null;
                    isAudioEnabled = false;
                }
            }

            function playWheelSound(speedFactor = 1) {
                if (!audioCtx || !isAudioEnabled) return;
                try {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);

                    const baseFreq = 120 + speedFactor * 60;
                    osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
                    osc.type = 'sawtooth';

                    const now = audioCtx.currentTime;
                    gain.gain.setValueAtTime(0.08, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                    osc.start(now);
                    osc.stop(now + 0.15);

                    const osc2 = audioCtx.createOscillator();
                    const gain2 = audioCtx.createGain();
                    osc2.connect(gain2);
                    gain2.connect(audioCtx.destination);
                    osc2.frequency.setValueAtTime(baseFreq * 1.5, now);
                    osc2.type = 'square';
                    gain2.gain.setValueAtTime(0.04, now);
                    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                    osc2.start(now);
                    osc2.stop(now + 0.12);

                    const bufferSize = audioCtx.sampleRate * 0.08;
                    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
                    }
                    const noise = audioCtx.createBufferSource();
                    const noiseGain = audioCtx.createGain();
                    noise.buffer = buffer;
                    noise.connect(noiseGain);
                    noiseGain.connect(audioCtx.destination);
                    noiseGain.gain.setValueAtTime(0.06 * speedFactor, now);
                    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                    noise.start(now);
                    noise.stop(now + 0.08);
                } catch (e) {}
            }

            function prepareTimerAudio() {
                if (!audioCtx) initAudio();
                if (audioCtx?.state === 'suspended') {
                    audioCtx.resume().catch(() => {});
                }
            }

            function playTimerSound(isWarning = false, isFinished = false) {
                if (!audioCtx || !isAudioEnabled) return;
                try {
                    const now = audioCtx.currentTime;
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.type = isFinished ? 'square' : 'sine';
                    osc.frequency.setValueAtTime(isFinished ? 920 : (isWarning ? 760 : 520), now);
                    gain.gain.setValueAtTime(isFinished ? 0.16 : 0.08, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinished ? 0.28 : 0.11));
                    osc.start(now);
                    osc.stop(now + (isFinished ? 0.28 : 0.11));
                } catch (e) {}
            }

            // ---------- draw wheel ----------
            function drawWheel(rotation = 0) {
                const w = canvas.width, h = canvas.height;
                const centerX = w / 2, centerY = h / 2;
                const radius = Math.min(w, h) * 0.44;
                ctx.clearRect(0, 0, w, h);

                for (let i = 0; i < NUM_SEGMENTS; i++) {
                    const start = i * segmentAngle + rotation;
                    const end = start + segmentAngle;
                    const isPicked = pickedSet.has(i + 1);

                    let color = people[i].color;
                    if (isPicked) color = '#2d3748';

                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    ctx.arc(centerX, centerY, radius, start, end);
                    ctx.closePath();
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.strokeStyle = '#0f1422';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    const midAngle = start + segmentAngle / 2;
                    const labelRadius = radius * 0.7;
                    const x = centerX + Math.cos(midAngle) * labelRadius;
                    const y = centerY + Math.sin(midAngle) * labelRadius;
                    ctx.fillStyle = isPicked ? '#5a6a82' : '#0b0d15';
                    ctx.font = 'bold 16px "Inter", sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(i + 1, x, y);
                }

                ctx.beginPath();
                ctx.arc(centerX, centerY, radius * 0.12, 0, TAU);
                ctx.fillStyle = '#1e263b';
                ctx.fill();
                ctx.shadowColor = '#f1c40f33';
                ctx.shadowBlur = 20;
                ctx.strokeStyle = '#f1c40f55';
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // ---------- update displays ----------
            function updateDisplays() {
                pickedCountEl.textContent = pickedSet.size;
                leftCountEl.textContent = 45 - pickedSet.size;
                nextBtn.disabled = roundPicks.length < ROUND_SIZE;
                nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i> next';

                roundBadge.textContent = `Round ${roundPicks.length}/${ROUND_SIZE}`;

                if (roundPicks.length === 0) {
                    roundResults.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-hand-pointer"></i>
                            <span>spin 5 times to complete round</span>
                        </div>
                    `;
                } else {
                    roundResults.innerHTML = roundPicks.map((p, index) => `
                        <div class="result-item">
                            ${getAvatarMarkup(p, 'r-avatar')}
                            <div class="r-info">
                                <div class="r-name">${escapeHtml(p.name)}</div>
                                <div class="r-number">${p.number}</div>
                            </div>
                            <div class="r-spin-num">spin ${index + 1}</div>
                            <button class="remove-person-btn" data-number="${p.number}" aria-label="Remove ${escapeHtml(p.name)}">
                                <i class="fas fa-xmark"></i>
                            </button>
                        </div>
                    `).join('');
                }

                if (pickedList.length === 0) {
                    historyGrid.innerHTML = `
                        <div class="empty-history">
                            <i class="fas fa-inbox"></i>
                            <span>no picks yet</span>
                        </div>
                    `;
                } else {
                    historyGrid.innerHTML = pickedList.map(p => `
                        <div class="history-card">
                            ${getAvatarMarkup(p, 'h-avatar')}
                            <div class="h-info">
                                <div class="h-name">${escapeHtml(p.name)}</div>
                                <div class="h-number">${p.number}</div>
                            </div>
                            <button class="remove-person-btn" data-number="${p.number}" aria-label="Remove ${escapeHtml(p.name)}">
                                <i class="fas fa-xmark"></i>
                            </button>
                        </div>
                    `).join('');
                }

                if (savedRounds.length === 0) {
                    savedGrid.innerHTML = `
                        <div class="empty-history">
                            <i class="fas fa-inbox"></i>
                            <span>no saved details yet</span>
                        </div>
                    `;
                } else {
                    savedGrid.innerHTML = savedRounds.slice().reverse().map((round, reverseIndex) => {
                        const roundNumber = savedRounds.length - reverseIndex;
                        return `
                        <section class="saved-round">
                            <h4>Round ${roundNumber} result</h4>
                            <div class="saved-round-grid">
                                ${round.map(p => `
                                    <div class="history-card saved-card">
                                        ${getAvatarMarkup(p, 'h-avatar')}
                                        <div class="h-info">
                                            <div class="h-name">${escapeHtml(p.name)}</div>
                                            <div class="h-number">${p.number}</div>
                                            ${p.role ? `<div class="h-detail">${escapeHtml(p.role)}</div>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </section>
                    `;
                    }).join('');
                }

                applyAvatarColors();
                renderGameReveal();
            }

            function shouldShowEnterButton(game) {
                if (!game) return false;
                if (Boolean(game.has_enter)) return true;
                const timerValue = Number(game.enter_timer_seconds);
                return Number.isFinite(timerValue) && timerValue > 0;
            }

            function isSpinBlockedByGameReveal() {
                return Boolean(isGameRevealVisible);
            }

            function updateSpinButtonState() {
                spinBtn.disabled = Boolean(isSpinning || scheduledSpinTimeout || isSpinBlockedByGameReveal());
            }

            function blockSpinIfGameRevealVisible() {
                if (!isSpinBlockedByGameReveal()) return false;
                updateSpinButtonState();
                showToast('Click Next on the game screen before spinning again.');
                return true;
            }

            function renderGameReveal() {
                if (gameRevealSection && gameRevealCard) {
                    gameRevealSection.hidden = true;
                    gameRevealCard.innerHTML = '';
                }

                if (!gameFullscreenOverlay || !gameFullscreenCard) return;

                if (!isGameRevealVisible) {
                    stopGameTimer();
                    isGameTimerVisible = false;
                    gameFullscreenOverlay.classList.remove('active');
                    gameFullscreenOverlay.setAttribute('aria-hidden', 'true');
                    gameFullscreenCard.classList.remove('is-timer');
                    gameFullscreenCard.innerHTML = '';
                    updateSpinButtonState();
                    return;
                }

                gameFullscreenOverlay.classList.add('active');
                gameFullscreenOverlay.setAttribute('aria-hidden', 'false');
                gameFullscreenCard.classList.toggle('is-timer', isGameTimerVisible);
                updateSpinButtonState();

                if (!selectedGame) {
                    gameFullscreenCard.innerHTML = `
                        <div class="game-fullscreen-empty">
                            <i class="fas fa-gamepad"></i>
                            <span>Waiting for admin to select a game</span>
                            <button class="game-next-btn" type="button" data-game-next><i class="fas fa-arrow-right"></i> Next</button>
                        </div>
                    `;
                    return;
                }

                if (isGameTimerVisible) {
                    const alreadyRenderingTimer = gameFullscreenCard.querySelector('.game-timer-view')
                        && gameFullscreenCard.dataset.timerGameId === selectedGame.id;
                    if (!alreadyRenderingTimer) {
                        gameFullscreenCard.innerHTML = getGameTimerMarkup();
                        gameFullscreenCard.dataset.timerGameId = selectedGame.id;
                    }
                    updateGameTimerDisplay();
                    return;
                }

                const revealedPlayers = savedRounds[savedRounds.length - 1] || [];
                gameFullscreenCard.innerHTML = `
                    <div class="game-poster-media${selectedGame.image_url ? '' : ' is-placeholder'}">
                        ${selectedGame.image_url ? `<img src="${escapeHtml(selectedGame.image_url)}" alt="${escapeHtml(selectedGame.name)}" />` : '<i class="fas fa-gamepad" aria-hidden="true"></i>'}
                        <div class="game-poster-title">
                            <span>next game</span>
                            <strong>${escapeHtml(selectedGame.name)}</strong>
                        </div>
                    </div>
                    <section class="game-players" aria-label="Selected players">
                        <h2><i class="fas fa-users"></i> Selected players</h2>
                        <div class="game-players-grid">
                            ${revealedPlayers.length ? revealedPlayers.map((person) => `
                                <div class="game-player">
                                    ${getAvatarMarkup(person, 'game-player-avatar')}
                                    <strong>${escapeHtml(person.name)}</strong>
                                    <span>${person.number}</span>
                                    ${person.role ? `<em>${escapeHtml(person.role)}</em>` : ''}
                                    ${person.note ? `<small>${escapeHtml(person.note)}</small>` : ''}
                                </div>
                            `).join('') : '<p class="game-players-empty">Player details will appear here after the round is saved.</p>'}
                        </div>
                    </section>
                    <div class="game-fullscreen-info">
                        <div class="game-fullscreen-actions">
                            ${shouldShowEnterButton(selectedGame) ? '<button class="game-enter-btn" type="button" data-game-enter><i class="fas fa-right-to-bracket"></i> Enter</button>' : ''}
                            <button class="game-next-btn" type="button" data-game-next><i class="fas fa-arrow-right"></i> Next</button>
                        </div>
                    </div>
                `;
            }

            function getGameTimerMarkup() {
                const minutes = Math.floor(gameTimerDurationSeconds / 60);
                const seconds = gameTimerDurationSeconds % 60;
                const poster = selectedGame?.image_url
                    ? `<img src="${escapeHtml(selectedGame.image_url)}" alt="${escapeHtml(selectedGame.name)}" />`
                    : '<i class="fas fa-gamepad" aria-hidden="true"></i>';
                return `
                    <div class="game-timer-view">
                        <div class="game-timer-visual${selectedGame?.image_url ? '' : ' is-placeholder'}">
                            ${poster}
                            <div class="game-timer-heading">
                                <span>game timer</span>
                                <strong>${escapeHtml(selectedGame?.name || 'Selected Game')}</strong>
                            </div>
                            <div class="game-timer-display game-timer-display-overlay" data-game-timer-display>${formatTimer(gameTimerRemainingSeconds)}</div>
                        </div>
                        <div class="game-timer-panel">
                            <div class="game-timer-fields" aria-label="Timer duration">
                                <label>
                                    <span>Minutes</span>
                                    <input type="number" min="0" max="5999" step="1" value="${minutes}" data-game-timer-minutes />
                                </label>
                                <label>
                                    <span>Seconds</span>
                                    <input type="number" min="0" max="59" step="1" value="${seconds}" data-game-timer-seconds />
                                </label>
                            </div>
                            <div class="game-timer-actions">
                                <button class="game-enter-btn" type="button" data-game-timer-action="start"><i class="fas fa-play"></i> Start</button>
                                <button class="game-next-btn" type="button" data-game-timer-action="pause"><i class="fas fa-pause"></i> Pause</button>
                                <button class="game-next-btn" type="button" data-game-timer-action="reset"><i class="fas fa-rotate-left"></i> Reset</button>
                                <button class="game-next-btn" type="button" data-game-next><i class="fas fa-arrow-right"></i> Next</button>
                            </div>
                        </div>
                    </div>
                `;
            }

            function formatTimer(totalSeconds) {
                const total = Math.max(0, Math.floor(totalSeconds || 0));
                const hours = Math.floor(total / 3600);
                const minutes = Math.floor((total % 3600) / 60);
                const seconds = total % 60;
                const paddedSeconds = String(seconds).padStart(2, '0');
                if (hours > 0) {
                    return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`;
                }
                return `${minutes}:${paddedSeconds}`;
            }

            function updateGameTimerDisplay() {
                const display = gameFullscreenCard?.querySelector('[data-game-timer-display]');
                if (display) display.textContent = formatTimer(gameTimerRemainingSeconds);
                const timerView = gameFullscreenCard?.querySelector('.game-timer-view');
                timerView?.classList.toggle('is-running', isGameTimerRunning);
                timerView?.classList.toggle('is-finished', gameTimerRemainingSeconds === 0);
                timerView?.classList.toggle('is-warning', gameTimerRemainingSeconds > 0 && gameTimerRemainingSeconds <= 10);
            }

            function stopGameTimer() {
                clearInterval(gameTimerInterval);
                gameTimerInterval = null;
                isGameTimerRunning = false;
            }

            function tickGameTimer() {
                if (!isGameTimerRunning) return;
                gameTimerRemainingSeconds = Math.max(0, gameTimerRemainingSeconds - 1);
                updateGameTimerDisplay();
                if (gameTimerRemainingSeconds === 0) {
                    playTimerSound(true, true);
                    stopGameTimer();
                    updateGameTimerDisplay();
                    showToast('Timer complete.');
                } else {
                    playTimerSound(gameTimerRemainingSeconds <= 10);
                }
            }

            function readGameTimerInputs() {
                const minuteInput = gameFullscreenCard?.querySelector('[data-game-timer-minutes]');
                const secondInput = gameFullscreenCard?.querySelector('[data-game-timer-seconds]');
                const minutes = Math.max(0, Math.floor(Number(minuteInput?.value) || 0));
                const seconds = Math.max(0, Math.min(59, Math.floor(Number(secondInput?.value) || 0)));
                return normalizeTimerSeconds((minutes * 60) + seconds);
            }

            function resetGameTimer(useInputs = false) {
                stopGameTimer();
                gameTimerDurationSeconds = useInputs ? readGameTimerInputs() : normalizeTimerSeconds(selectedGame?.enter_timer_seconds);
                gameTimerRemainingSeconds = gameTimerDurationSeconds;
                updateGameTimerDisplay();
            }

            function startGameTimer(useInputs = false) {
                prepareTimerAudio();
                stopGameTimer();
                if (useInputs || gameTimerRemainingSeconds <= 0 || gameTimerRemainingSeconds === gameTimerDurationSeconds) {
                    gameTimerDurationSeconds = readGameTimerInputs();
                    gameTimerRemainingSeconds = gameTimerDurationSeconds;
                }
                isGameTimerRunning = true;
                updateGameTimerDisplay();
                playTimerSound(gameTimerRemainingSeconds <= 10);
                gameTimerInterval = setInterval(tickGameTimer, 1000);
            }

            function pauseGameTimer() {
                if (!isGameTimerRunning) return;
                stopGameTimer();
                updateGameTimerDisplay();
            }

            function handleGameTimerInput() {
                stopGameTimer();
                gameTimerDurationSeconds = readGameTimerInputs();
                gameTimerRemainingSeconds = gameTimerDurationSeconds;
                updateGameTimerDisplay();
            }

            function handleGameTimerAction(action) {
                if (action === 'start') startGameTimer();
                if (action === 'pause') pauseGameTimer();
                if (action === 'reset') resetGameTimer(true);
            }

            function revealSelectedGame() {
                isGameRevealVisible = true;
                isGameTimerVisible = false;
                resetGameTimer(false);
                renderGameReveal();
                gameFullscreenCard?.querySelector('[data-game-next], [data-game-enter]')?.focus();
            }

            function hideGameReveal() {
                stopGameTimer();
                isGameTimerVisible = false;
                isGameRevealVisible = false;
                renderGameReveal();
            }

            function enterSelectedGame() {
                if (!selectedGame) return;
                if (!shouldShowEnterButton(selectedGame)) return;
                isGameTimerVisible = true;
                resetGameTimer(false);
                renderGameReveal();
                gameFullscreenCard?.querySelector('[data-game-timer-action="start"]')?.focus();
            }

            function applyAvatarColors() {
                document.querySelectorAll('[data-color]').forEach((avatar) => {
                    avatar.style.setProperty('--avatar-color', avatar.dataset.color);
                });
            }

            function updateSpeedBar(speed) {
                const bars = speedBar.querySelectorAll('span');
                const activeCount = Math.round(speed * 5);
                bars.forEach((bar, index) => {
                    bar.classList.toggle('active', index < activeCount);
                });
            }

            function showToast(message) {
                toast.textContent = message;
                toast.classList.add('is-visible');
                clearTimeout(showToast.timeoutId);
                showToast.timeoutId = setTimeout(() => {
                    toast.classList.remove('is-visible');
                }, 2200);
            }

            function hideRoundCompleteOverlay() {
                if (!roundCompleteOverlay) return;
                roundCompleteOverlay.classList.remove('active');
                roundCompleteOverlay.setAttribute('aria-hidden', 'true');
            }

            function showRoundCompleteOverlay() {
                if (!roundCompleteOverlay || !roundCompleteGrid) return;

                roundCompleteGrid.innerHTML = roundPicks.map((person) => `
                    <div class="round-complete-item">
                        ${getAvatarMarkup(person, 'round-complete-avatar')}
                        <div class="round-complete-name">${escapeHtml(person.name)}</div>
                        <div class="round-complete-number">${person.number}</div>
                    </div>
                `).join('');

                roundCompleteOverlay.classList.add('active');
                roundCompleteOverlay.setAttribute('aria-hidden', 'false');
                applyAvatarColors();
                roundCompleteNext?.focus();
            }

            function syncSharedUi() {
                if (isSpinning || scheduledSpinTimeout) return;

                overlay.classList.remove('active');
                overlayImage.hidden = true;
                overlayImage.removeAttribute('src');
                overlayInitial.hidden = false;
                updateSpeedBar(0);

                if (roundPicks.length >= ROUND_SIZE) {
                    showRoundCompleteOverlay();
                } else {
                    hideRoundCompleteOverlay();
                }
            }

            function getAvailableNumbers() {
                const available = [];
                for (let i = 1; i <= NUM_SEGMENTS; i++) {
                    if (!pickedSet.has(i)) available.push(i);
                }
                return available;
            }

            function hashString(value) {
                let hash = 2166136261;
                const text = String(value || '');
                for (let i = 0; i < text.length; i++) {
                    hash ^= text.charCodeAt(i);
                    hash = Math.imul(hash, 16777619);
                }
                return hash >>> 0;
            }

            function chooseDeterministicNumber(available, seed) {
                if (!available.length) return null;
                return available[hashString(seed) % available.length];
            }

            function createSpinPlan() {
                const available = getAvailableNumbers();
                if (available.length === 0) return null;

                return {
                    targetNumber: available[Math.floor(Math.random() * available.length)],
                    extraRotations: Math.floor(Math.random() * 4),
                    source: clientInstanceId,
                    createdAt: Date.now(),
                    startAt: Date.now() + 700
                };
            }

            function parseSpinCommand(row) {
                if (!row) return null;

                if (row.id) {
                    if (processedSpinCommands.has(row.id)) return null;
                    processedSpinCommands.add(row.id);
                }

                try {
                    const command = JSON.parse(row.source || '{}');
                    const targetNumber = Number(command.targetNumber);

                    if (Number.isInteger(targetNumber) && targetNumber >= 1 && targetNumber <= NUM_SEGMENTS) {
                        return {
                            targetNumber,
                            extraRotations: Number.isInteger(command.extraRotations) ? command.extraRotations : 0,
                            source: command.source || '',
                            createdAt: command.createdAt || 0,
                            startAt: Number(command.startAt) || 0,
                            seed: row.id || command.createdAt || row.source || Date.now()
                        };
                    }

                    return {
                        targetNumber: null,
                        extraRotations: Number.isInteger(command.extraRotations) ? command.extraRotations : 0,
                        source: command.source || '',
                        createdAt: command.createdAt || 0,
                        startAt: Number(command.startAt) || 0,
                        seed: row.id || command.createdAt || row.source || Date.now()
                    };
                } catch (error) {
                    return {
                        targetNumber: null,
                        extraRotations: hashString(row.id || row.source || row.created_at) % 4,
                        source: row.source || 'legacy-apk',
                        createdAt: row.created_at || 0,
                        startAt: 0,
                        seed: row.id || row.source || row.created_at || Date.now()
                    };
                }
            }

            function handleSpinCommand(row) {
                const command = parseSpinCommand(row);
                if (!command) return;
                scheduleSpin(command);
            }

            function scheduleSpin(command) {
                if (isSpinBlockedByGameReveal()) {
                    updateSpinButtonState();
                    return;
                }
                if (isSpinning || scheduledSpinTimeout) return;
                spinBtn.disabled = true;

                const delay = Math.max(0, (Number(command?.startAt) || 0) - Date.now());
                scheduledSpinTimeout = setTimeout(() => {
                    scheduledSpinTimeout = null;
                    spinWheel(command);
                }, delay);
            }

            async function requestSpin() {
                if (blockSpinIfGameRevealVisible()) return;
                if (isSpinning || scheduledSpinTimeout) return;

                if (roundPicks.length >= ROUND_SIZE) {
                    showRoundCompleteOverlay();
                    showToast('Round complete. Review the results and continue.');
                    return;
                }

                if (pickedSet.size >= NUM_SEGMENTS) {
                    showToast('Wheel is empty. All numbers are selected.');
                    return;
                }

                const command = createSpinPlan();
                if (!command) return;

                const client = initializeSupabaseClient();
                if (!client || !supabaseReady) {
                    scheduleSpin(command);
                    return;
                }

                spinBtn.disabled = true;

                try {
                    const { data, error } = await client
                        .from('spin_commands')
                        .insert({ source: JSON.stringify(command) })
                        .select('id, source')
                        .single();

                    if (error) throw error;

                    if (data?.id) processedSpinCommands.add(data.id);
                    scheduleSpin(command);
                } catch (error) {
                    console.warn('Spin sync failed; using local spin.', error);
                    showToast('Live sync failed. Spinning on this device only.');
                    scheduleSpin({ ...command, startAt: Date.now() });
                }
            }

            // ---------- SPIN with MORE THAN 5 ROTATIONS and 5 SECONDS ----------
            function spinWheel(command = null) {
                if (isSpinBlockedByGameReveal()) {
                    updateSpinButtonState();
                    return;
                }
                if (isSpinning) return;
                scheduledSpinTimeout = null;

                if (roundPicks.length >= ROUND_SIZE) {
                    showRoundCompleteOverlay();
                    showToast('Round complete. Review the results and continue.');
                    return;
                }

                if (pickedSet.size >= NUM_SEGMENTS) {
                    showToast('Wheel is empty. All numbers are selected.');
                    return;
                }

                if (!audioCtx) {
                    initAudio();
                }

                const available = getAvailableNumbers();
                if (available.length === 0) return;

                const plannedTarget = Number(command?.targetNumber);
                const hasSyncedTarget = Number.isInteger(plannedTarget) && plannedTarget >= 1 && plannedTarget <= NUM_SEGMENTS;
                const targetNumber = hasSyncedTarget
                    ? plannedTarget
                    : (command?.seed
                        ? chooseDeterministicNumber(available, command.seed)
                        : available[Math.floor(Math.random() * available.length)]);
                const targetIndex = targetNumber - 1;
                
                // Calculate the exact angle to land on the target segment
                // The pointer is at -PI/2 (top of the wheel)
                // We want the pointer to point to the middle of the target segment
                const segMid = targetIndex * segmentAngle + segmentAngle / 2;
                
                // Calculate the rotation needed: pointer at -PI/2 should align with segMid
                // rotation + segMid = -PI/2 + (full rotations)
                // rotation = -PI/2 - segMid + (full rotations)
                let targetRotation = -PI / 2 - segMid;
                
                // Add at least 5 full rotations, plus a little extra variation.
                const extraRotations = Number.isInteger(command?.extraRotations)
                    ? Math.max(0, Math.min(command.extraRotations, 3))
                    : Math.floor(Math.random() * 4);
                const plannedRotations = MIN_SPIN_ROTATIONS + extraRotations;
                
                // Add full rotations to the target
                targetRotation += plannedRotations * TAU;
                
                // Ensure every spin moves forward by at least 5 full wheel rotations.
                const minimumEndAngle = currentAngle + MIN_SPIN_ROTATIONS * TAU;
                while (targetRotation < minimumEndAngle) {
                    targetRotation += TAU;
                }

                // Show rotation count
                isSpinning = true;
                spinBtn.disabled = true;
                const spinToken = ++activeSpinToken;

                const startAngle = currentAngle;
                const endAngle = targetRotation;
                // Fixed 5 seconds for every spin.
                const duration = SPIN_DURATION_MS;
                const startTime = performance.now();

                let lastSoundTime = 0;

                function getSpeed(progress) {
                    // Speed profile: slow start -> fast middle -> slow end
                    if (progress < 0.15) {
                        return 0.15 + (progress / 0.15) * 0.85;
                    } else if (progress < 0.7) {
                        return 1.0;
                    } else {
                        return 1.0 - ((progress - 0.7) / 0.3) * 0.85;
                    }
                }

                function playSoundAtSpeed(speed) {
                    if (audioCtx) {
                        playWheelSound(speed);
                    }
                    updateSpeedBar(speed);
                }

                // Initial sound
                playSoundAtSpeed(0.15);

                function animate(now) {
                    if (spinToken !== activeSpinToken) return;

                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    // Cubic ease-out for smooth deceleration
                    const ease = 1 - Math.pow(1 - progress, 3);
                    const current = startAngle + (endAngle - startAngle) * ease;

                    drawWheel(current);
                    // Update currentAngle during animation so it tracks properly
                    currentAngle = current;

                    const speed = getSpeed(progress);
                    const interval = 80 / (speed + 0.2);
                    if (now - lastSoundTime > interval) {
                        playSoundAtSpeed(speed);
                        lastSoundTime = now;
                    }

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        // Final position - store the exact end angle
                        currentAngle = endAngle;
                        drawWheel(endAngle);

                        playSoundAtSpeed(0.1);

                        const person = people[targetIndex];

                        bigNumberEl.textContent = person.number;
                        const initial = person.name.charAt(0).toUpperCase();
                        overlayAvatar.style.setProperty('--avatar-color', person.color);
                        overlayAvatar.style.backgroundImage = '';
                        overlayInitial.textContent = initial;
                        overlayInitial.hidden = Boolean(person.image_url);
                        overlayImage.hidden = !person.image_url;
                        overlayImage.src = person.image_url || '';
                        overlayImage.alt = person.image_url ? person.name : '';
                        overlayName.textContent = person.name;
                        overlayNumber.textContent = person.number;
                        if (overlayRole) {
                            overlayRole.textContent = person.role || '';
                            overlayRole.hidden = !person.role;
                        }
                        if (overlayNote) {
                            overlayNote.textContent = person.note || '';
                            overlayNote.hidden = !person.note;
                        }

                        overlay.classList.add('active');

                        updateSpeedBar(0);

                        setTimeout(() => {
                            if (spinToken !== activeSpinToken) return;

                            overlay.classList.remove('active');

                            pickedSet.add(targetNumber);
                            pickedList.push({ ...person });
                            roundPicks.push({ ...person });
                            currentPerson = { ...person };
                            lastTargetNumber = targetNumber;

                            updateDisplays();
                            persistState('spin-result', { targetNumber });

                            isSpinning = false;
                            updateSpinButtonState();
                            flushPendingRemoteState();

                            if (roundPicks.length >= ROUND_SIZE) {
                                setTimeout(() => {
                                    showRoundCompleteOverlay();
                                    showToast('Round complete. Review the results and continue.');
                                }, 250);
                            } else if (pickedSet.size >= 45) {
                                setTimeout(() => {
                                    showToast('Wheel is empty. Click Next to save the final picks.');
                                }, 300);
                            }

                            // Redraw at final position to ensure consistency
                            drawWheel(currentAngle);
                        }, OVERLAY_HOLD_MS);
                    }
                }
                requestAnimationFrame(animate);
            }

            // ---------- save and remove ----------
            function resetCurrentRound() {
                activeSpinToken += 1;
                pickedList.length = 0;
                roundPicks = [];
                currentPerson = null;
                lastTargetNumber = null;
                drawWheel(currentAngle);
                isSpinning = false;
                updateSpinButtonState();
                overlay.classList.remove('active');
                overlayImage.hidden = true;
                overlayImage.removeAttribute('src');
                overlayInitial.hidden = false;
                updateSpeedBar(0);
            }

            async function clearAllState() {
                if (!confirm('Clear all picks and reset the wheel?')) return;

                resetLocalState();
                await persistState('cleared');

                showToast('Wheel reset.');
            }

            async function saveCurrentAndShowSaved() {
                hideRoundCompleteOverlay();

                if (pickedList.length === 0) {
                    showToast('Spin first, then click Next to save.');
                    return;
                }

                if (roundPicks.length < ROUND_SIZE) {
                    showToast(`Select ${ROUND_SIZE} people before clicking Next.`);
                    return;
                }

                pickedList.forEach((person) => {
                    if (!savedPeople.some((saved) => saved.number === person.number)) {
                        savedPeople.push({ ...person });
                    }
                });
                savedRounds.push(pickedList.map((person) => ({ ...person })));

                resetCurrentRound();
                updateDisplays();
                await refreshGameStateFromCloud();
                revealSelectedGame();
                await persistState('round-saved');
                showToast(selectedGame ? `${selectedGame.name} revealed.` : 'Round saved. Waiting for admin game.');
            }

            function removePerson(number) {
                const parsedNumber = Number(number);
                if (!Number.isInteger(parsedNumber)) return;

                removeFromList(pickedList, parsedNumber);
                removeFromList(roundPicks, parsedNumber);
                removeFromList(savedPeople, parsedNumber);
                removeFromSavedRounds(parsedNumber);

                if (currentPerson?.number === parsedNumber) currentPerson = null;
                if (lastTargetNumber === parsedNumber) lastTargetNumber = null;

                drawWheel(currentAngle);
                updateDisplays();
                syncSharedUi();
                persistState('person-removed', { number: parsedNumber });
            }

            function removeFromList(list, number) {
                const index = list.findIndex((person) => person.number === number);
                if (index !== -1) list.splice(index, 1);
            }

            function removeFromSavedRounds(number) {
                for (let i = savedRounds.length - 1; i >= 0; i--) {
                    removeFromList(savedRounds[i], number);
                    if (savedRounds[i].length === 0) savedRounds.splice(i, 1);
                }
            }

            // ---------- init ----------
            async function init() {
                resetLocalState();
                initAudio();

                const client = initializeSupabaseClient();
                if (client) {
                    supabaseReady = true;
                    const loadedCount = await loadPeopleFromSupabase();
                    drawWheel(currentAngle);
                    if (loadedCount > 0) {
                        showToast(`Loaded ${loadedCount} people from Supabase.`);
                    } else {
                        showToast('No Supabase people found. Using sample names.');
                    }
                    await loadPersistedState();
                    subscribeToWheelState();
                    subscribeToSpinCommands();
                } else {
                    console.warn('Supabase is not configured yet. Replace the URL and anon key in script.js to enable cloud syncing.');
                }
            }

            // ---------- events ----------
            spinBtn.addEventListener('click', requestSpin);
            clearBtn.addEventListener('click', () => clearAllState());
            nextBtn.addEventListener('click', saveCurrentAndShowSaved);
            roundCompleteNext?.addEventListener('click', saveCurrentAndShowSaved);
            gameFullscreenOverlay?.addEventListener('click', (event) => {
                const nextButton = event.target.closest('[data-game-next]');
                const enterButton = event.target.closest('[data-game-enter]');
                const timerButton = event.target.closest('[data-game-timer-action]');
                if (timerButton) {
                    event.preventDefault();
                    handleGameTimerAction(timerButton.dataset.gameTimerAction);
                    return;
                }
                if (enterButton) {
                    enterSelectedGame();
                    return;
                }
                if (nextButton) hideGameReveal();
            });

            gameFullscreenOverlay?.addEventListener('input', (event) => {
                if (event.target.matches('[data-game-timer-minutes], [data-game-timer-seconds]')) {
                    handleGameTimerInput();
                }
            });

            document.addEventListener('click', (e) => {
                const removeButton = e.target.closest('.remove-person-btn');
                if (!removeButton) return;
                removePerson(removeButton.dataset.number);
            });

            document.addEventListener('keydown', (e) => {
                if (e.code === 'Escape' && isGameRevealVisible) {
                    hideGameReveal();
                    return;
                }

                if (e.code === 'Space' && !e.repeat) {
                    e.preventDefault();
                    requestSpin();
                }
            });

            init();
            window.addEventListener('resize', () => drawWheel(currentAngle));
        })();

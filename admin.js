(function() {
    const config = window.FAREWELL_SUPABASE_CONFIG || {};
    const tableName = config.peopleTable || 'people';
    const bucketName = config.imageBucket || 'person-images';
    const client = window.supabase && config.url && config.anonKey
        ? window.supabase.createClient(config.url, config.anonKey)
        : null;

    const form = document.getElementById('personForm');
    const personNumber = document.getElementById('personNumber');
    const personName = document.getElementById('personName');
    const personRole = document.getElementById('personRole');
    const personNote = document.getElementById('personNote');
    const personImage = document.getElementById('personImage');
    const imagePreview = document.getElementById('imagePreview');
    const imageDrop = document.getElementById('imageDrop');
    const peopleGrid = document.getElementById('peopleGrid');
    const peopleCount = document.getElementById('peopleCount');
    const cancelledGrid = document.getElementById('cancelledGrid');
    const cancelledCount = document.getElementById('cancelledCount');
    const gameAdminGrid = document.getElementById('gameAdminGrid');
    const selectedGameStatus = document.getElementById('selectedGameStatus');
    const gameForm = document.getElementById('gameForm');
    const gameName = document.getElementById('gameName');
    const gamePosterUrl = document.getElementById('gamePosterUrl');
    const gamePosterFile = document.getElementById('gamePosterFile');
    const gamePosterPreview = document.getElementById('gamePosterPreview');
    const gamePosterDrop = document.getElementById('gamePosterDrop');
    const gameDetails = document.getElementById('gameDetails');
    const gameRequirements = document.getElementById('gameRequirements');
    const gameHasEnter = document.getElementById('gameHasEnter');
    const gameTimerSeconds = document.getElementById('gameTimerSeconds');
    const saveGameBtn = document.getElementById('saveGameBtn');
    const adminSectionTabs = document.querySelectorAll('[data-admin-tab]');
    const adminSectionPanels = document.querySelectorAll('[data-admin-section]');
    const savePersonBtn = document.getElementById('savePersonBtn');
    const refreshPeopleBtn = document.getElementById('refreshPeopleBtn');
    const connectionStatus = document.getElementById('connectionStatus');
    const formMode = document.getElementById('formMode');
    const toast = document.getElementById('toast');
    const setupPanel = document.getElementById('setupPanel');
    const copySetupBtn = document.getElementById('copySetupBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    let editingId = null;
    let currentImageUrl = '';
    let isSetupReady = true;
    let isAuthenticated = false;
    let latestPeople = [];
    let latestWheelState = null;
    let wheelStateChannel = null;
    let editingGameId = null;
    let currentGamePosterUrl = '';

    const defaultGameOptions = [
        { id: 'musical-chair', name: 'Musical Chair', image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=900&q=80', has_enter: false, is_default: true },
        { id: 'treasure-hunt', name: 'Treasure Hunt', image_url: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80', has_enter: false, is_default: true },
        { id: 'dumb-charades', name: 'Dumb Charades', image_url: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=900&q=80', has_enter: false, is_default: true },
        { id: 'balloon-pop', name: 'Balloon Pop', image_url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=80', has_enter: false, is_default: true },
        { id: 'quiz-battle', name: 'Quiz Battle', image_url: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=900&q=80', has_enter: false, is_default: true },
        { id: 'paper-dance', name: 'Paper Dance', image_url: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?auto=format&fit=crop&w=900&q=80', has_enter: false, is_default: true },
        { id: 'memory-game', name: 'Memory Game', image_url: 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?auto=format&fit=crop&w=900&q=80', has_enter: false, is_default: true },
        { id: 'rapid-fire', name: 'Rapid Fire', image_url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=900&q=80', has_enter: false, is_default: true },
        { id: 'blindfold-challenge', name: 'Blindfold Challenge', image_url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80', has_enter: false, is_default: true },
        { id: 'minute-to-win-it', name: 'Minute To Win It', image_url: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=900&q=80', has_enter: false, is_default: true }
    ];
    const defaultGameIds = new Set(defaultGameOptions.map((game) => game.id));

    const autoColors = [
        '#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#f78c6b',
        '#9b5de5', '#00bbf9', '#f15bb5', '#fee440', '#00f5d4',
        '#ff9f1c', '#2ec4b6', '#e71d36', '#7bdff2', '#b2f7ef',
        '#ff70a6', '#70d6ff', '#ff9770', '#caffbf', '#a0c4ff',
        '#bdb2ff', '#ffc6ff', '#fdffb6', '#8ac926', '#ff595e',
        '#1982c4', '#c77dff', '#4cc9f0', '#f72585', '#b517ff',
        '#3a86ff', '#ffbe0b', '#fb5607', '#52b788', '#64dfdf',
        '#f94144', '#f3722c', '#f8961e', '#90be6d', '#277da1',
        '#c77dff', '#80ffdb', '#ffcad4', '#b8f2e6', '#ffd6a5'
    ];

    function autoColorForNumber(number) {
        const index = Math.abs((Number(number) || 1) - 1) % autoColors.length;
        return autoColors[index];
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

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('is-visible');
        clearTimeout(showToast.timeoutId);
        showToast.timeoutId = setTimeout(() => toast.classList.remove('is-visible'), 2400);
    }

    function normalizeTimerSeconds(value) {
        const seconds = Number(value);
        if (!Number.isFinite(seconds) || seconds < 1) return 60;
        return Math.min(359999, Math.floor(seconds));
    }

    function normalizeGame(game) {
        if (!game || !game.id) return null;
        const match = getGameOptions().find((item) => item.id === game.id);
        return match ? { ...match } : {
            id: String(game.id),
            name: String(game.name || 'Selected Game'),
            image_url: String(game.image_url || ''),
            has_enter: Boolean(game.has_enter),
            enter_timer_seconds: normalizeTimerSeconds(game.enter_timer_seconds),
            details: String(game.details || ''),
            requirements: String(game.requirements || ''),
            is_default: Boolean(game.is_default || defaultGameIds.has(String(game.id)))
        };
    }

    function getGameOptions() {
        const savedGames = Array.isArray(latestWheelState?.games) ? latestWheelState.games : [];
        const removedIds = new Set(Array.isArray(latestWheelState?.removedGameIds) ? latestWheelState.removedGameIds.map(String) : []);
        const merged = defaultGameOptions
            .filter((game) => !removedIds.has(game.id))
            .map((game) => ({ ...game }));

        savedGames.forEach((game) => {
            if (!game?.id || !game?.name) return;
            if (removedIds.has(String(game.id))) return;
            const normalized = {
                id: String(game.id),
                name: String(game.name),
                image_url: String(game.image_url || ''),
                has_enter: Boolean(game.has_enter),
                enter_timer_seconds: normalizeTimerSeconds(game.enter_timer_seconds),
                details: String(game.details || ''),
                requirements: String(game.requirements || ''),
                is_default: Boolean(game.is_default || defaultGameIds.has(String(game.id)))
            };
            const existingIndex = merged.findIndex((item) => item.id === normalized.id);
            if (existingIndex === -1) {
                merged.push(normalized);
            } else {
                merged[existingIndex] = normalized;
            }
        });
        return merged;
    }

    function setStatus(kind, text) {
        const icon = kind === 'ready' ? 'fa-circle-check' : kind === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-notch fa-spin';
        connectionStatus.className = `admin-status ${kind}`;
        connectionStatus.innerHTML = `<i class="fas ${icon}"></i>${text}`;
    }

    function publicImageUrl(path) {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const { data } = client.storage.from(bucketName).getPublicUrl(path);
        return data.publicUrl;
    }

    async function uploadImage(file, number) {
        if (!file) return currentImageUrl;

        const extension = file.name.split('.').pop() || 'jpg';
        const safeName = `${number}-${Date.now()}.${extension.toLowerCase()}`;
        const { error } = await client.storage
            .from(bucketName)
            .upload(safeName, file, { cacheControl: '3600', upsert: true });

        if (error) throw error;
        return publicImageUrl(safeName);
    }

    async function uploadGamePoster(file) {
        if (!file) return '';

        const extension = file.name.split('.').pop() || 'jpg';
        const safeName = `game-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension.toLowerCase()}`;
        const { error } = await client.storage
            .from(bucketName)
            .upload(safeName, file, { cacheControl: '3600', upsert: true });

        if (error) throw error;
        return publicImageUrl(safeName);
    }

    async function saveWheelState(nextState) {
        const { data, error: loadError } = await client
            .from('wheel_state')
            .select('data')
            .eq('id', 'main')
            .maybeSingle();

        if (loadError) throw loadError;

        const currentState = data?.data || {};
        const adminState = {};
        ['games', 'removedGameIds', 'selectedGame', 'lastAction'].forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(nextState, key)) {
                adminState[key] = nextState[key];
            }
        });
        const mergedState = {
            ...currentState,
            ...adminState
        };

        const { error } = await client.from('wheel_state').upsert({
            id: 'main',
            updated_at: new Date().toISOString(),
            data: mergedState
        }, { onConflict: 'id' });

        if (error) throw error;
        latestWheelState = mergedState;
    }

    async function loadPeople() {
        if (!client) {
            setStatus('error', 'not configured');
            isSetupReady = false;
            savePersonBtn.disabled = true;
            return;
        }

        if (!isAuthenticated) {
            savePersonBtn.disabled = true;
            return;
        }

        setStatus('loading', 'loading');
        const { data, error } = await client
            .from(tableName)
            .select('id, number, name, role, note, color, image_url, created_at')
            .order('number', { ascending: true });

        if (error) {
            isSetupReady = false;
            setupPanel.hidden = false;
            savePersonBtn.disabled = true;
            setStatus('error', error.code === 'PGRST205' || error.message.includes('schema cache') ? 'table missing' : 'setup needed');
            peopleGrid.innerHTML = `
                <div class="admin-empty">
                    <i class="fas fa-database"></i>
                    <span>Run supabase-setup.sql in Supabase, then click Refresh.</span>
                </div>
            `;
            showToast(error.message);
            return;
        }

        isSetupReady = true;
        setupPanel.hidden = true;
        savePersonBtn.disabled = false;
        setStatus('ready', 'connected');
        latestPeople = (data || []).map((person) => ({
            ...person,
            color: autoColorForNumber(person.number)
        }));
        renderPeople(latestPeople);
        await loadWheelState();
    }

    function renderPeople(people) {
        peopleCount.textContent = `${people.length} saved`;

        if (!people.length) {
            peopleGrid.innerHTML = `
                <div class="admin-empty">
                    <i class="fas fa-address-book"></i>
                    <span>No people yet</span>
                </div>
            `;
            return;
        }

        peopleGrid.innerHTML = people.map((person) => {
            const image = person.image_url || '';
            const initial = escapeHtml((person.name || '?').charAt(0).toUpperCase());
            return `
                <article class="admin-person-card">
                    <div class="admin-person-media" style="--avatar-color:${escapeHtml(person.color || '#f1c40f')}">
                        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(person.name)}" loading="lazy" data-fallback="${initial}" />` : `<span>${initial}</span>`}
                    </div>
                    <div class="admin-person-info">
                        <div class="admin-person-top">
                            <strong>${escapeHtml(person.name)}</strong>
                            <span>${escapeHtml(person.number)}</span>
                        </div>
                        <p>${escapeHtml(person.role || person.note || 'No extra detail')}</p>
                    </div>
                    <div class="admin-card-actions">
                        <button type="button" class="icon-admin-btn" data-edit='${escapeHtml(JSON.stringify(person))}' aria-label="Edit ${escapeHtml(person.name)}"><i class="fas fa-pen"></i></button>
                        <button type="button" class="icon-admin-btn danger" data-delete="${escapeHtml(person.id)}" aria-label="Delete ${escapeHtml(person.name)}"><i class="fas fa-trash-can"></i></button>
                    </div>
                </article>
            `;
        }).join('');
    }

    function getStateListNumbers(list) {
        if (!Array.isArray(list)) return [];
        return list
            .map((person) => Number(person && person.number))
            .filter((number) => Number.isInteger(number));
    }

    function getCancelledNumbers(state) {
        const data = state || {};
        const pickedNumbers = Array.isArray(data.pickedNumbers)
            ? data.pickedNumbers.map(Number).filter((number) => Number.isInteger(number))
            : [];
        const visibleNumbers = new Set([
            ...getStateListNumbers(data.pickedList),
            ...getStateListNumbers(data.savedPeople),
            ...(Array.isArray(data.savedRounds) ? data.savedRounds.flatMap(getStateListNumbers) : []),
            ...getStateListNumbers(data.roundPicks)
        ]);

        return pickedNumbers
            .filter((number) => !visibleNumbers.has(number))
            .sort((a, b) => a - b);
    }

    async function loadWheelState() {
        if (!client || !isAuthenticated || !isSetupReady) return;

        const { data, error } = await client
            .from('wheel_state')
            .select('data')
            .eq('id', 'main')
            .maybeSingle();

        if (error) {
            latestWheelState = null;
            renderCancelledPicks([]);
            showToast(error.message);
            return;
        }

        latestWheelState = data?.data || null;
        renderCancelledPicks(getCancelledNumbers(latestWheelState));
        renderGameOptions();
    }

    function renderGameOptions() {
        if (!gameAdminGrid || !selectedGameStatus) return;

        const selectedGame = normalizeGame(latestWheelState?.selectedGame);
        selectedGameStatus.textContent = selectedGame ? selectedGame.name : 'none selected';

        gameAdminGrid.innerHTML = getGameOptions().map((game) => {
            const isSelected = selectedGame?.id === game.id;
            return `
                <article class="game-option-card ${isSelected ? 'selected' : ''}">
                    ${game.image_url ? `<img src="${escapeHtml(game.image_url)}" alt="${escapeHtml(game.name)}" loading="lazy" />` : ''}
                    <div class="game-card-badge ${isSelected ? 'is-selected' : ''}">
                        <i class="fas ${isSelected ? 'fa-check-circle' : 'fa-gamepad'}"></i>
                        <span>${isSelected ? 'Selected' : 'Tap to select'}</span>
                    </div>
                    <button class="game-select-zone" type="button" data-game-select="${escapeHtml(game.id)}" aria-pressed="${isSelected}">
                        <span>${escapeHtml(game.name)}</span>
                    </button>
                    ${game.has_enter ? '<em>Enter enabled</em>' : ''}
                    <i class="fas ${isSelected ? 'fa-check-double' : 'fa-arrow-right'}"></i>
                    <div class="game-card-actions">
                        <button type="button" class="icon-admin-btn" data-game-edit="${escapeHtml(game.id)}" aria-label="Edit ${escapeHtml(game.name)}"><i class="fas fa-pen"></i></button>
                        <button type="button" class="icon-admin-btn danger" data-game-delete="${escapeHtml(game.id)}" aria-label="Remove ${escapeHtml(game.name)}"><i class="fas fa-trash-can"></i></button>
                    </div>
                </article>
            `;
        }).join('');
    }

    async function selectGame(gameId) {
        const game = getGameOptions().find((item) => item.id === gameId);
        if (!game) return;

        const nextState = {
            ...(latestWheelState || {}),
            selectedGame: { ...game },
            lastAction: {
                id: `admin-game-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                type: 'game-selected',
                source: 'admin',
                at: Date.now(),
                details: { gameId: game.id }
            }
        };

        try {
            await saveWheelState(nextState);
        } catch (error) {
            showToast(error.message || 'Game selection failed.');
            return;
        }

        renderGameOptions();
        showToast(`${game.name} selected.`);
    }

    async function saveGame(event) {
        event.preventDefault();
        if (!client || !isAuthenticated || !isSetupReady) {
            showToast('Supabase is not ready.');
            return;
        }

        const name = gameName.value.trim();
        if (!name) {
            showToast('Enter a game name.');
            return;
        }

        saveGameBtn.disabled = true;
        saveGameBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ${editingGameId ? 'Updating' : 'Adding'}`;
        const wasEditingGame = Boolean(editingGameId);

        try {
            const uploadedPoster = await uploadGamePoster(gamePosterFile.files[0]);
            const imageUrl = uploadedPoster || gamePosterUrl.value.trim() || currentGamePosterUrl;
            if (!imageUrl) {
                showToast('Add a poster URL or upload a poster.');
                return;
            }

            const game = {
                id: editingGameId || `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                name,
                image_url: imageUrl,
                has_enter: Boolean(gameHasEnter?.checked),
                enter_timer_seconds: normalizeTimerSeconds(gameTimerSeconds?.value),
                details: gameDetails.value.trim(),
                requirements: gameRequirements.value.trim(),
                is_default: defaultGameIds.has(editingGameId || '')
            };
            const games = getGameOptions()
                .filter((item) => item.id !== game.id)
                .concat(game);
            const selectedGame = latestWheelState?.selectedGame?.id === game.id || !editingGameId
                ? { ...game }
                : latestWheelState?.selectedGame || null;
            const nextState = {
                ...(latestWheelState || {}),
                games,
                selectedGame,
                lastAction: {
                    id: `admin-game-saved-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    type: editingGameId ? 'game-updated' : 'game-added',
                    source: 'admin',
                    at: Date.now(),
                    details: { gameId: game.id }
                }
            };

            await saveWheelState(nextState);
            resetGameForm();
            renderGameOptions();
            showToast(`${game.name} ${wasEditingGame ? 'updated' : 'added and selected'}.`);
        } catch (error) {
            showToast(error.message || 'Game save failed.');
        } finally {
            saveGameBtn.disabled = false;
            saveGameBtn.innerHTML = editingGameId
                ? '<i class="fas fa-floppy-disk"></i> Update Game'
                : '<i class="fas fa-plus"></i> Add Game';
        }
    }

    function resetGameForm() {
        gameForm.reset();
        editingGameId = null;
        currentGamePosterUrl = '';
        gamePosterPreview.removeAttribute('src');
        gamePosterDrop.classList.remove('has-image');
        if (gameTimerSeconds) gameTimerSeconds.value = '60';
        saveGameBtn.innerHTML = '<i class="fas fa-plus"></i> Add Game';
    }

    function editGame(gameId) {
        const game = getGameOptions().find((item) => item.id === gameId);
        if (!game) return;

        editingGameId = game.id;
        currentGamePosterUrl = game.image_url || '';
        gameName.value = game.name || '';
        gamePosterUrl.value = game.image_url || '';
        gameDetails.value = game.details || '';
        gameRequirements.value = game.requirements || '';
        gameHasEnter.checked = Boolean(game.has_enter);
        if (gameTimerSeconds) gameTimerSeconds.value = String(normalizeTimerSeconds(game.enter_timer_seconds));
        saveGameBtn.innerHTML = '<i class="fas fa-floppy-disk"></i> Update Game';

        if (currentGamePosterUrl) {
            gamePosterPreview.src = currentGamePosterUrl;
            gamePosterDrop.classList.add('has-image');
        } else {
            gamePosterPreview.removeAttribute('src');
            gamePosterDrop.classList.remove('has-image');
        }

        gameName.focus();
    }

    async function deleteGame(gameId) {
        const game = getGameOptions().find((item) => item.id === gameId);
        if (!game) return;
        if (!confirm(`Remove ${game.name}?`)) return;

        const removedGameIds = new Set(Array.isArray(latestWheelState?.removedGameIds) ? latestWheelState.removedGameIds.map(String) : []);
        if (defaultGameIds.has(game.id)) {
            removedGameIds.add(game.id);
        }

        const nextGames = getGameOptions().filter((item) => item.id !== game.id);
        const nextSelectedGame = latestWheelState?.selectedGame?.id === game.id ? null : latestWheelState?.selectedGame || null;
        const nextState = {
            ...(latestWheelState || {}),
            games: nextGames,
            removedGameIds: Array.from(removedGameIds),
            selectedGame: nextSelectedGame,
            lastAction: {
                id: `admin-game-removed-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                type: 'game-removed',
                source: 'admin',
                at: Date.now(),
                details: { gameId: game.id }
            }
        };

        try {
            await saveWheelState(nextState);
            if (editingGameId === game.id) resetGameForm();
            renderGameOptions();
            showToast(`${game.name} removed.`);
        } catch (error) {
            showToast(error.message || 'Remove failed.');
        }
    }

    function renderCancelledPicks(numbers) {
        cancelledCount.textContent = `${numbers.length} waiting`;

        if (!numbers.length) {
            cancelledGrid.innerHTML = `
                <div class="admin-empty compact-empty">
                    <i class="fas fa-circle-check"></i>
                    <span>No cancelled picks waiting</span>
                </div>
            `;
            return;
        }

        cancelledGrid.innerHTML = numbers.map((number) => {
            const person = latestPeople.find((item) => Number(item.number) === number) || { number, name: `Number ${number}` };
            const image = person.image_url || '';
            const initial = escapeHtml((person.name || '?').charAt(0).toUpperCase());
            const color = autoColorForNumber(number);
            return `
                <article class="admin-person-card cancelled-card">
                    <div class="admin-person-media" style="--avatar-color:${escapeHtml(color)}">
                        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(person.name)}" loading="lazy" data-fallback="${initial}" />` : `<span>${initial}</span>`}
                    </div>
                    <div class="admin-person-info">
                        <div class="admin-person-top">
                            <strong>${escapeHtml(person.name)}</strong>
                            <span>${escapeHtml(number)}</span>
                        </div>
                        <p>Removed from results, still blocked from spinning.</p>
                    </div>
                    <div class="admin-card-actions">
                        <button type="button" class="icon-admin-btn success" data-readd="${escapeHtml(number)}" aria-label="Re-add ${escapeHtml(person.name)} to spin"><i class="fas fa-rotate-left"></i></button>
                    </div>
                </article>
            `;
        }).join('');
    }

    async function savePerson(event) {
        event.preventDefault();
        if (!isAuthenticated) {
            window.location.href = 'login.html';
            return;
        }

        if (!client || !isSetupReady) {
            showToast('Run supabase-setup.sql first, then refresh.');
            return;
        }

        if (!client) {
            showToast('Supabase is not configured.');
            return;
        }

        const number = Number(personNumber.value);
        if (!Number.isInteger(number) || number < 1 || number > 45) {
            showToast('Choose a number from 1 to 45.');
            return;
        }

        savePersonBtn.disabled = true;
        savePersonBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Saving';

        try {
            const imageUrl = await uploadImage(personImage.files[0], number);
            const payload = {
                number,
                name: personName.value.trim(),
                role: personRole.value.trim(),
                note: personNote.value.trim(),
                color: autoColorForNumber(number),
                image_url: imageUrl || null
            };

            const query = editingId
                ? client.from(tableName).update(payload).eq('id', editingId)
                : client.from(tableName).upsert(payload, { onConflict: 'number' });

            const { error } = await query;
            if (error) throw error;

            showToast(editingId ? 'Person updated.' : 'Person saved.');
            resetForm(true);
            await loadPeople();
        } catch (error) {
            showToast(error.message || 'Save failed.');
        } finally {
            savePersonBtn.disabled = false;
            savePersonBtn.innerHTML = '<i class="fas fa-floppy-disk"></i> Save';
        }
    }

    function resetForm(shouldResetFields = false) {
        if (shouldResetFields) {
            form.reset();
        }
        editingId = null;
        currentImageUrl = '';
        imagePreview.removeAttribute('src');
        imageDrop.classList.remove('has-image');
        formMode.textContent = 'ready';
    }

    async function deletePerson(id) {
        if (!isAuthenticated) {
            window.location.href = 'login.html';
            return;
        }

        if (!confirm('Delete this person?')) return;
        const { error } = await client.from(tableName).delete().eq('id', id);
        if (error) {
            showToast(error.message);
            return;
        }
        showToast('Person deleted.');
        loadPeople();
    }

    function editPerson(person) {
        editingId = person.id;
        currentImageUrl = person.image_url || '';
        personNumber.value = person.number || '';
        personName.value = person.name || '';
        personRole.value = person.role || '';
        personNote.value = person.note || '';
        formMode.textContent = `editing ${person.number}`;

        if (currentImageUrl) {
            imagePreview.src = currentImageUrl;
            imageDrop.classList.add('has-image');
        } else {
            imagePreview.removeAttribute('src');
            imageDrop.classList.remove('has-image');
        }

        personName.focus();
    }

    async function readdCancelledPick(number) {
        const parsedNumber = Number(number);
        if (!Number.isInteger(parsedNumber)) return;

        const { data, error: loadError } = await client
            .from('wheel_state')
            .select('data')
            .eq('id', 'main')
            .maybeSingle();

        if (loadError) {
            showToast(loadError.message);
            return;
        }

        const state = data?.data || latestWheelState || {};
        const withoutNumber = (list) => Array.isArray(list)
            ? list.filter((person) => Number(person && person.number) !== parsedNumber)
            : [];

        const nextState = {
            ...state,
            pickedNumbers: Array.isArray(state.pickedNumbers)
                ? state.pickedNumbers.map(Number).filter((item) => item !== parsedNumber)
                : [],
            pickedList: withoutNumber(state.pickedList),
            savedPeople: withoutNumber(state.savedPeople),
            savedRounds: Array.isArray(state.savedRounds)
                ? state.savedRounds
                    .map(withoutNumber)
                    .filter((round) => round.length > 0)
                : [],
            roundPicks: withoutNumber(state.roundPicks),
            currentPerson: Number(state.currentPerson?.number) === parsedNumber ? null : state.currentPerson,
            lastTargetNumber: Number(state.lastTargetNumber) === parsedNumber ? null : state.lastTargetNumber
        };

        const { error } = await client.from('wheel_state').upsert({
            id: 'main',
            updated_at: new Date().toISOString(),
            data: nextState
        }, { onConflict: 'id' });

        if (error) {
            showToast(error.message);
            return;
        }

        latestWheelState = nextState;
        renderCancelledPicks(getCancelledNumbers(nextState));
        renderGameOptions();
        showToast(`${parsedNumber} can spin again.`);
    }

    personImage.addEventListener('change', () => {
        const file = personImage.files[0];
        if (!file) return;
        imagePreview.src = URL.createObjectURL(file);
        imageDrop.classList.add('has-image');
    });

    form.addEventListener('submit', savePerson);
    form.addEventListener('reset', () => setTimeout(() => resetForm(false), 0));
    gameForm?.addEventListener('submit', saveGame);
    gameForm?.addEventListener('reset', () => {
        setTimeout(() => {
            editingGameId = null;
            currentGamePosterUrl = '';
            gamePosterPreview.removeAttribute('src');
            gamePosterDrop.classList.remove('has-image');
            if (gameTimerSeconds) gameTimerSeconds.value = '60';
            saveGameBtn.innerHTML = '<i class="fas fa-plus"></i> Add Game';
        }, 0);
    });
    gamePosterFile?.addEventListener('change', () => {
        const file = gamePosterFile.files[0];
        if (!file) return;
        gamePosterPreview.src = URL.createObjectURL(file);
        gamePosterDrop.classList.add('has-image');
    });
    adminSectionTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.adminTab;
            adminSectionTabs.forEach((item) => item.classList.toggle('active', item === tab));
            adminSectionPanels.forEach((panel) => {
                panel.classList.toggle('active', panel.dataset.adminSection === target);
            });
        });
    });
    refreshPeopleBtn.addEventListener('click', loadPeople);
    copySetupBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('supabase-setup.sql');
            const sql = await response.text();
            await navigator.clipboard.writeText(sql);
            showToast('SQL copied.');
        } catch (error) {
            showToast('Open supabase-setup.sql and copy it manually.');
        }
    });
    function handleAdminCardClick(event) {
        const editButton = event.target.closest('[data-edit]');
        const deleteButton = event.target.closest('[data-delete]');
        const readdButton = event.target.closest('[data-readd]');
        if (editButton) editPerson(JSON.parse(editButton.dataset.edit));
        if (deleteButton) deletePerson(deleteButton.dataset.delete);
        if (readdButton) readdCancelledPick(readdButton.dataset.readd);
    }

    peopleGrid.addEventListener('click', handleAdminCardClick);
    cancelledGrid.addEventListener('click', handleAdminCardClick);
    gameAdminGrid?.addEventListener('click', (event) => {
        const selectButton = event.target.closest('[data-game-select]');
        const editButton = event.target.closest('[data-game-edit]');
        const deleteButton = event.target.closest('[data-game-delete]');
        if (selectButton) selectGame(selectButton.dataset.gameSelect);
        if (editButton) editGame(editButton.dataset.gameEdit);
        if (deleteButton) deleteGame(deleteButton.dataset.gameDelete);
    });

    function handleCardImageError(event) {
        const image = event.target;
        if (!image.matches('.admin-person-media img')) return;
        const fallback = image.dataset.fallback || '?';
        image.replaceWith(Object.assign(document.createElement('span'), { textContent: fallback }));
    }

    peopleGrid.addEventListener('error', handleCardImageError, true);
    cancelledGrid.addEventListener('error', handleCardImageError, true);
    gameAdminGrid?.addEventListener('error', (event) => {
        if (!event.target.matches('.game-option-card img')) return;
        event.target.hidden = true;
    }, true);

    function subscribeToWheelState() {
        if (!client || wheelStateChannel) return;

        wheelStateChannel = client
            .channel('admin-wheel-state-live')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'wheel_state',
                    filter: 'id=eq.main'
                },
                (payload) => {
                    latestWheelState = payload.eventType === 'DELETE' ? null : payload.new?.data || null;
                    renderCancelledPicks(getCancelledNumbers(latestWheelState));
                    renderGameOptions();
                }
            )
            .subscribe();
    }

    logoutBtn.addEventListener('click', async () => {
        if (client) await client.auth.signOut();
        window.location.href = 'login.html';
    });

    async function requireAdminSession() {
        if (!client) {
            setStatus('error', 'not configured');
            savePersonBtn.disabled = true;
            return;
        }

        const { data, error } = await client.auth.getSession();
        if (error || !data.session) {
            window.location.href = 'login.html';
            return;
        }

        isAuthenticated = true;
        await loadPeople();
        subscribeToWheelState();
    }

    requireAdminSession();
})();

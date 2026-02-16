// Initialize data structure
var trackerData = {
    currentWeight: 145,
    goalWeight: 180,
    startWeight: 145,
    calorieGoal: 3000,
    dailyLogs: {},
    weightHistory: [],
    personalRecords: {},
    bestStreak: 0,
    mealPresets: [],
    exerciseLibrary: [],
    progressPhotos: []
};

// ── Motivation Quotes ────────────────────────────────────
var motivationQuotes = [
    "The only bad workout is the one that didn't happen.",
    "Your body can stand almost anything. It's your mind you have to convince.",
    "The pain you feel today will be the strength you feel tomorrow.",
    "Don't stop when you're tired. Stop when you're done.",
    "Success isn't always about greatness. It's about consistency.",
    "The difference between try and triumph is a little umph.",
    "Motivation is what gets you started. Habit is what keeps you going.",
    "The hard days are what make you stronger.",
    "You don't have to be extreme, just consistent.",
    "Discipline is choosing between what you want now and what you want most.",
    "Fall in love with taking care of yourself.",
    "It's not about being the best. It's about being better than you were yesterday.",
    "The body achieves what the mind believes.",
    "Strive for progress, not perfection.",
    "What seems impossible today will one day become your warm-up.",
    "Your only limit is you.",
    "The secret of getting ahead is getting started.",
    "Sweat is fat crying.",
    "Champions keep playing until they get it right.",
    "No one ever drowned in sweat.",
    "Be stronger than your excuses.",
    "The clock is ticking. Are you becoming the person you want to be?",
    "A one-hour workout is 4% of your day. No excuses.",
    "If it doesn't challenge you, it won't change you.",
    "Wake up with determination. Go to bed with satisfaction.",
    "You are one workout away from a good mood.",
    "Sore today, strong tomorrow.",
    "Good things come to those who sweat.",
    "Results happen over time, not overnight. Stay patient and stay consistent.",
    "Believe in yourself and all that you are."
];

function getDailyQuote() {
    var today = new Date();
    var seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return motivationQuotes[seed % motivationQuotes.length];
}

function renderQuoteBanner() {
    var banner = document.getElementById('quote-banner');
    if (banner) {
        banner.textContent = '"' + getDailyQuote() + '"';
    }
}

// ── Monthly Calendar State ───────────────────────────────
var currentMonthView = new Date();

// ── Auth UI ──────────────────────────────────────────────

function showAuthOverlay() {
    document.getElementById('auth-overlay').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

function hideAuthOverlay() {
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
}

function switchAuthTab(tab) {
    var tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(function(t) { t.classList.remove('active'); });

    document.getElementById('auth-error').style.display = 'none';

    if (tab === 'login') {
        tabs[0].classList.add('active');
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('signup-form').style.display = 'none';
    } else {
        tabs[1].classList.add('active');
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
    }
}

function showAuthError(msg) {
    var el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = 'block';
}

async function handleLogin(e) {
    e.preventDefault();
    var username = document.getElementById('login-username').value;
    var password = document.getElementById('login-password').value;

    try {
        var data = await api.login({ username: username, password: password });
        api.setToken(data.token);
        applyUserProfile(data.user);
        hideAuthOverlay();
        await loadData();
    } catch (err) {
        showAuthError(err.message || 'Login failed');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    var username = document.getElementById('signup-username').value;
    var password = document.getElementById('signup-password').value;
    var currentWeight = parseFloat(document.getElementById('signup-weight').value) || 145;
    var goalWeight = parseFloat(document.getElementById('signup-goal').value) || 180;
    // Auto-calculate calorie goal: bodyweight x 15 (TDEE) + 500 surplus if bulking, or - 500 deficit if cutting
    var tdee = Math.round(currentWeight * 15);
    var calorieGoal = goalWeight > currentWeight ? tdee + 500 : goalWeight < currentWeight ? tdee - 500 : tdee;

    try {
        var data = await api.signup({
            username: username,
            password: password,
            currentWeight: currentWeight,
            goalWeight: goalWeight,
            startWeight: currentWeight,
            calorieGoal: calorieGoal
        });
        api.setToken(data.token);
        applyUserProfile(data.user);
        hideAuthOverlay();
        await loadData();
    } catch (err) {
        showAuthError(err.message || 'Signup failed');
    }
}

function handleLogout() {
    api.clearToken();
    localStorage.removeItem('fitnessTrackerData');
    trackerData = {
        currentWeight: 145,
        goalWeight: 180,
        startWeight: 145,
        calorieGoal: 3000,
        dailyLogs: {},
        weightHistory: [],
        personalRecords: {},
        bestStreak: 0,
        mealPresets: [],
        exerciseLibrary: [],
        progressPhotos: []
    };
    showAuthOverlay();
}

function applyUserProfile(user) {
    trackerData.currentWeight = user.currentWeight;
    trackerData.goalWeight = user.goalWeight;
    trackerData.startWeight = user.startWeight;
    trackerData.calorieGoal = user.calorieGoal;
    trackerData.bestStreak = user.bestStreak;
    saveDataLocal();
}

// ── Data persistence ─────────────────────────────────────

function saveDataLocal() {
    localStorage.setItem('fitnessTrackerData', JSON.stringify(trackerData));
}

// Load from API first, fallback to localStorage
async function loadData() {
    // Load localStorage cache first for instant display
    var saved = localStorage.getItem('fitnessTrackerData');
    if (saved) {
        trackerData = JSON.parse(saved);
    }

    if (api.isLoggedIn()) {
        try {
            // Load profile from API
            var profile = await api.get('/profile');
            trackerData.currentWeight = profile.currentWeight;
            trackerData.goalWeight = profile.goalWeight;
            trackerData.startWeight = profile.startWeight;
            trackerData.calorieGoal = profile.calorieGoal;
            trackerData.bestStreak = profile.bestStreak;

            // Show admin link if user is admin
            var adminLink = document.getElementById('admin-link');
            if (adminLink) {
                adminLink.style.display = profile.isAdmin ? 'inline-block' : 'none';
            }

            // Load today's log
            var today = getTodayString();
            var dayData = await api.get('/logs/' + today);
            trackerData.dailyLogs[today] = {
                water: dayData.water,
                calories: dayData.calories,
                meals: dayData.meals,
                gym: dayData.gym,
                running: dayData.running
            };

            // Load week range for calendar + streak
            var weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 6);
            var from = getDateString(weekAgo);
            var to = today;
            var weekData = await api.get('/logs?from=' + from + '&to=' + to);
            for (var dateKey in weekData) {
                trackerData.dailyLogs[dateKey] = {
                    water: weekData[dateKey].water,
                    calories: weekData[dateKey].calories,
                    meals: weekData[dateKey].meals,
                    gym: weekData[dateKey].gym,
                    running: weekData[dateKey].running
                };
            }

            // Load weight history
            var weightHist = await api.get('/weight/history');
            trackerData.weightHistory = weightHist;

            saveDataLocal();

            // Load Phase 8 data
            await loadMealPresets();
            await loadExerciseLibrary();
            await loadProgressPhotos();
        } catch (err) {
            console.warn('API load failed, using cached data:', err.message);
        }
    }

    updateDashboard();
}

function saveData() {
    saveDataLocal();
}

// Get today's date string
function getTodayString() {
    var today = new Date();
    return today.toISOString().split('T')[0];
}

// Get date string for a given date
function getDateString(date) {
    return date.toISOString().split('T')[0];
}

// Initialize today's log if it doesn't exist
function initTodayLog() {
    var today = getTodayString();
    if (!trackerData.dailyLogs[today]) {
        trackerData.dailyLogs[today] = {
            water: false,
            calories: 0,
            meals: [],
            gym: null,
            running: null
        };
    }
    return trackerData.dailyLogs[today];
}

// Check if a day is "complete" (at least 3 of 4 metrics hit)
function isDayComplete(dayLog) {
    if (!dayLog) return false;
    var score = 0;
    if (dayLog.water) score++;
    if (dayLog.gym) score++;
    if (dayLog.running) score++;
    if (dayLog.calories >= trackerData.calorieGoal) score++;
    return score >= 3;
}

// Calculate current streak
function calculateStreak() {
    var streak = 0;
    var today = new Date();

    var todayLog = trackerData.dailyLogs[getTodayString()];
    var startOffset = isDayComplete(todayLog) ? 0 : 1;

    for (var i = startOffset; i < 365; i++) {
        var date = new Date(today);
        date.setDate(date.getDate() - i);
        var dateStr = getDateString(date);
        var dayLog = trackerData.dailyLogs[dateStr];

        if (isDayComplete(dayLog)) {
            streak++;
        } else {
            break;
        }
    }

    if (streak > trackerData.bestStreak) {
        trackerData.bestStreak = streak;
        saveData();
        // Sync best streak to API
        if (api.isLoggedIn()) {
            api.put('/profile', { bestStreak: streak }).catch(function() {});
        }
    }

    return streak;
}

// Toggle water completion
async function toggleWater() {
    var todayLog = initTodayLog();
    todayLog.water = !todayLog.water;
    saveData();
    updateDashboard();
    addActivity(todayLog.water ? 'Drank a gallon of water!' : 'Unmarked water intake');

    if (api.isLoggedIn()) {
        try {
            await api.put('/logs/' + getTodayString() + '/water');
        } catch (err) {
            console.warn('Water sync failed:', err.message);
        }
    }
}

// Show modal
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Show specific modals
function showGymModal() { showModal('gym-modal'); }
function showRunModal() { showModal('run-modal'); }
function showWeightModal() { showModal('weight-modal'); }

// Save gym session
async function saveGymSession() {
    var exercises = document.getElementById('gym-exercises').value;
    var prs = document.getElementById('gym-prs').value;

    if (!exercises) {
        alert('Please enter your exercises!');
        return;
    }

    var todayLog = initTodayLog();
    todayLog.gym = {
        exercises: exercises,
        prs: prs,
        timestamp: new Date().toLocaleTimeString()
    };

    if (prs) {
        trackerData.personalRecords[getTodayString()] = prs;
    }

    saveData();
    updateDashboard();
    closeModal('gym-modal');
    addActivity('Logged gym session' + (prs ? ' - New PR: ' + prs : ''));

    document.getElementById('gym-exercises').value = '';
    document.getElementById('gym-prs').value = '';

    if (api.isLoggedIn()) {
        try {
            await api.post('/logs/' + getTodayString() + '/gym', { exercises: exercises, prs: prs });
            // Auto-update exercise library from logged workout
            await updateExerciseLibrary(exercises);
        } catch (err) {
            console.warn('Gym sync failed:', err.message);
        }
    }
}

// Save run
async function saveRun() {
    var distance = parseFloat(document.getElementById('run-distance-input').value);
    var pace = document.getElementById('run-pace').value;
    var duration = parseInt(document.getElementById('run-duration').value);

    if (!distance || !pace) {
        alert('Please enter distance and pace!');
        return;
    }

    var todayLog = initTodayLog();
    todayLog.running = {
        distance: distance,
        pace: pace,
        duration: duration,
        timestamp: new Date().toLocaleTimeString()
    };

    saveData();
    updateDashboard();
    closeModal('run-modal');
    addActivity('Ran ' + distance + ' miles at ' + pace + ' pace');

    document.getElementById('run-distance-input').value = '';
    document.getElementById('run-pace').value = '';
    document.getElementById('run-duration').value = '';

    if (api.isLoggedIn()) {
        try {
            await api.post('/logs/' + getTodayString() + '/run', { distance: distance, pace: pace, duration: duration });
        } catch (err) {
            console.warn('Run sync failed:', err.message);
        }
    }
}

// Save meal
async function saveMeal() {
    var mealName = document.getElementById('meal-name').value;
    var calories = parseInt(document.getElementById('meal-calories').value);

    if (!mealName || !calories) {
        alert('Please enter meal name and calories!');
        return;
    }

    var todayLog = initTodayLog();
    todayLog.meals.push({
        name: mealName,
        calories: calories,
        timestamp: new Date().toLocaleTimeString()
    });
    todayLog.calories = todayLog.meals.reduce(function(sum, meal) { return sum + meal.calories; }, 0);

    saveData();
    updateDashboard();
    closeModal('calorie-modal');
    addActivity('Logged ' + mealName + ' (' + calories + ' cal)');

    document.getElementById('meal-name').value = '';
    document.getElementById('meal-calories').value = '';

    if (api.isLoggedIn()) {
        try {
            await api.post('/logs/' + getTodayString() + '/meals', { name: mealName, calories: calories });
        } catch (err) {
            console.warn('Meal sync failed:', err.message);
        }
    }
}

// Save weight
async function saveWeight() {
    var weight = parseFloat(document.getElementById('weight-input').value);

    if (!weight) {
        alert('Please enter your weight!');
        return;
    }

    trackerData.currentWeight = weight;
    trackerData.weightHistory.push({
        date: getTodayString(),
        weight: weight
    });

    saveData();
    updateDashboard();
    closeModal('weight-modal');
    addActivity('Weighed in at ' + weight + ' lbs');

    document.getElementById('weight-input').value = '';

    if (api.isLoggedIn()) {
        try {
            await api.post('/weight', { weight: weight });
        } catch (err) {
            console.warn('Weight sync failed:', err.message);
        }
    }
}

// Add activity to log
function addActivity(message) {
    var activityLog = document.getElementById('activity-log');
    var timestamp = new Date().toLocaleString();
    var activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = '<strong>' + timestamp + '</strong><br>' + message;
    activityLog.insertBefore(activityItem, activityLog.firstChild);
}

// Update dashboard display
function updateDashboard() {
    var todayLog = initTodayLog();

    // Update current date
    var today = new Date();
    document.getElementById('current-date').textContent = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Update water status
    document.getElementById('water-status').textContent = todayLog.water ? 'Gallon Complete!' : 'Not Yet';

    // Update calorie count
    var calorieEl = document.getElementById('calorie-count');
    calorieEl.textContent = todayLog.calories;
    if (todayLog.calories >= trackerData.calorieGoal) {
        calorieEl.style.color = '#4CAF50';
    } else {
        calorieEl.style.color = '#667eea';
    }
    document.getElementById('calorie-goal').textContent = trackerData.calorieGoal;

    // Update gym status
    document.getElementById('gym-status').textContent = todayLog.gym ? 'Completed' : 'Not Logged';

    // Update running
    if (todayLog.running) {
        document.getElementById('run-distance').textContent = todayLog.running.distance + ' mi @ ' + todayLog.running.pace;
    } else {
        document.getElementById('run-distance').textContent = '0 mi';
    }

    // Update weight progress
    document.getElementById('current-weight').textContent = trackerData.currentWeight;
    document.getElementById('goal-weight-display').textContent = trackerData.goalWeight;
    var weightGained = trackerData.currentWeight - trackerData.startWeight;
    var totalToGain = trackerData.goalWeight - trackerData.startWeight;
    var weightRemaining = trackerData.goalWeight - trackerData.currentWeight;
    var progressPercent = totalToGain > 0 ? (weightGained / totalToGain) * 100 : 0;

    document.getElementById('weight-gained').textContent = weightGained.toFixed(1);
    document.getElementById('weight-remaining').textContent = weightRemaining.toFixed(1);
    document.getElementById('weight-progress').style.width = Math.max(0, Math.min(progressPercent, 100)) + '%';

    // Update weight journey title dynamically
    document.getElementById('weight-journey-title').innerHTML =
        'Weight Journey: ' + trackerData.startWeight + ' &rarr; ' + trackerData.goalWeight + ' lbs';

    // Update streak
    var streak = calculateStreak();
    document.getElementById('streak-count').textContent = streak;
    document.getElementById('best-streak').textContent = trackerData.bestStreak;

    // Update week calendar
    updateWeekCalendar();

    // Update weight chart
    updateWeightChart();

    // Update today's meals list
    updateTodayMeals();

    // Phase 8 renders
    renderQuoteBanner();
    renderMonthlyCalendar();
}

// Update week calendar
function updateWeekCalendar() {
    var weekCalendar = document.getElementById('week-calendar');
    weekCalendar.innerHTML = '';

    var today = new Date();
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (var i = 6; i >= 0; i--) {
        var date = new Date(today);
        date.setDate(date.getDate() - i);
        var dateString = getDateString(date);
        var dayLog = trackerData.dailyLogs[dateString] || {};
        var isToday = i === 0;

        var dayCard = document.createElement('div');
        dayCard.className = 'day-card' + (isToday ? ' today' : '');

        var score = 0;
        if (dayLog.water) score++;
        if (dayLog.gym) score++;
        if (dayLog.running) score++;
        if (dayLog.calories >= trackerData.calorieGoal) score++;

        dayCard.innerHTML =
            '<h4>' + days[date.getDay()] + '</h4>' +
            '<div class="day-date">' + date.getDate() + '</div>' +
            '<div class="day-indicators">' +
                '<span class="indicator ' + (dayLog.water ? 'complete' : '') + '">Water ' + (dayLog.water ? '<span class="check">&#10003;</span>' : '') + '</span>' +
                '<span class="indicator ' + (dayLog.gym ? 'complete' : '') + '">Gym ' + (dayLog.gym ? '<span class="check">&#10003;</span>' : '') + '</span>' +
                '<span class="indicator ' + (dayLog.running ? 'complete' : '') + '">Run ' + (dayLog.running ? '<span class="check">&#10003;</span>' : '') + '</span>' +
                '<span class="indicator ' + (dayLog.calories >= trackerData.calorieGoal ? 'complete' : '') + '">Cals ' + (dayLog.calories >= trackerData.calorieGoal ? '<span class="check">&#10003;</span>' : '') + '</span>' +
            '</div>' +
            '<div class="day-score">' + score + '/4</div>';

        weekCalendar.appendChild(dayCard);
    }
}

// Update weight chart (mini bar chart of weight history)
function updateWeightChart() {
    var chart = document.getElementById('weight-chart');
    chart.innerHTML = '';

    var history = trackerData.weightHistory;
    if (history.length === 0) {
        chart.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">No weight entries yet. Log your first weigh-in!</p>';
        return;
    }

    // Show last 12 entries
    var entries = history.slice(-12);
    var minW = trackerData.startWeight - 5;
    var maxW = trackerData.goalWeight + 5;
    var range = maxW - minW;

    entries.forEach(function(entry) {
        var bar = document.createElement('div');
        bar.className = 'weight-bar';
        var heightPct = ((entry.weight - minW) / range) * 100;
        bar.style.height = Math.max(5, heightPct) + '%';
        bar.setAttribute('data-label', entry.date + ': ' + entry.weight + ' lbs');
        chart.appendChild(bar);
    });
}

// Update today's meals list
function updateTodayMeals() {
    var container = document.getElementById('today-meals');
    var todayLog = trackerData.dailyLogs[getTodayString()];

    if (!todayLog || !todayLog.meals || todayLog.meals.length === 0) {
        container.innerHTML = '<p style="color:#999; padding:10px;">No meals logged today yet.</p>';
        return;
    }

    var html = '';
    todayLog.meals.forEach(function(meal) {
        html += '<div class="meal-item">' +
            '<span class="meal-name">' + meal.name + '</span>' +
            '<span class="meal-cals">' + meal.calories + ' cal</span>' +
            '<span class="meal-time">' + meal.timestamp + '</span>' +
        '</div>';
    });

    html += '<div class="meal-item" style="border-left-color: #667eea; font-weight: bold;">' +
        '<span class="meal-name">Total</span>' +
        '<span class="meal-cals">' + todayLog.calories + ' / ' + trackerData.calorieGoal + ' cal</span>' +
        '<span class="meal-time"></span>' +
    '</div>';

    container.innerHTML = html;
}

// Export data
function exportData() {
    var dataStr = JSON.stringify(trackerData, null, 2);
    var dataBlob = new Blob([dataStr], {type: 'application/json'});
    var url = URL.createObjectURL(dataBlob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'fitness-tracker-' + getTodayString() + '.json';
    link.click();
}

// Reset today
async function resetDay() {
    if (confirm('Are you sure you want to reset today\'s data?')) {
        var today = getTodayString();
        delete trackerData.dailyLogs[today];
        saveData();
        updateDashboard();
        addActivity('Reset today\'s data');

        if (api.isLoggedIn()) {
            try {
                await api.delete('/logs/' + today);
            } catch (err) {
                console.warn('Day reset sync failed:', err.message);
            }
        }
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// ── Meal Presets ─────────────────────────────────────────

async function loadMealPresets() {
    try {
        var presets = await api.get('/presets');
        trackerData.mealPresets = presets;
        renderMealPresets();
    } catch (err) {
        console.warn('Load presets failed:', err.message);
    }
}

function renderMealPresets() {
    var container = document.getElementById('meal-presets-container');
    if (!container) return;

    if (!trackerData.mealPresets || trackerData.mealPresets.length === 0) {
        container.innerHTML = '';
        return;
    }

    var html = '<div class="presets-label">Quick Add:</div><div class="presets-chips">';
    trackerData.mealPresets.forEach(function(preset) {
        html += '<span class="preset-chip" onclick="quickAddPreset(' + preset.id + ', \'' + preset.name.replace(/'/g, "\\'") + '\', ' + preset.calories + ')">' +
            preset.name + ' (' + preset.calories + ' cal)' +
            '<span class="preset-delete" onclick="event.stopPropagation(); deletePreset(' + preset.id + ')">&times;</span>' +
        '</span>';
    });
    html += '</div>';
    container.innerHTML = html;
}

async function quickAddPreset(id, name, calories) {
    document.getElementById('meal-name').value = name;
    document.getElementById('meal-calories').value = calories;
    await saveMeal();
}

async function saveAsPreset() {
    var name = document.getElementById('meal-name').value;
    var calories = parseInt(document.getElementById('meal-calories').value);

    if (!name || !calories) {
        alert('Enter a meal name and calories first!');
        return;
    }

    if (!api.isLoggedIn()) return;

    try {
        var preset = await api.post('/presets', { name: name, calories: calories });
        trackerData.mealPresets.push(preset);
        renderMealPresets();
    } catch (err) {
        console.warn('Save preset failed:', err.message);
    }
}

async function deletePreset(id) {
    if (!api.isLoggedIn()) return;

    try {
        await api.delete('/presets/' + id);
        trackerData.mealPresets = trackerData.mealPresets.filter(function(p) { return p.id !== id; });
        renderMealPresets();
    } catch (err) {
        console.warn('Delete preset failed:', err.message);
    }
}

// ── Monthly Calendar ─────────────────────────────────────

async function renderMonthlyCalendar() {
    var container = document.getElementById('monthly-calendar');
    var titleEl = document.getElementById('monthly-title');
    if (!container || !titleEl) return;

    var year = currentMonthView.getFullYear();
    var month = currentMonthView.getMonth();
    var monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    titleEl.textContent = monthNames[month] + ' ' + year;

    var firstDay = new Date(year, month, 1);
    var lastDay = new Date(year, month + 1, 0);
    var startDow = firstDay.getDay();
    var daysInMonth = lastDay.getDate();

    // Fetch month data from API
    var from = getDateString(firstDay);
    var to = getDateString(lastDay);
    var monthData = {};

    if (api.isLoggedIn()) {
        try {
            monthData = await api.get('/logs?from=' + from + '&to=' + to);
        } catch (err) {
            console.warn('Monthly data load failed:', err.message);
        }
    }

    // Merge with local dailyLogs
    for (var dateKey in monthData) {
        if (!trackerData.dailyLogs[dateKey]) {
            trackerData.dailyLogs[dateKey] = monthData[dateKey];
        }
    }

    var html = '';

    // Empty cells for days before the 1st
    for (var e = 0; e < startDow; e++) {
        html += '<div class="monthly-day empty"></div>';
    }

    var todayStr = getTodayString();

    for (var d = 1; d <= daysInMonth; d++) {
        var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        var dayLog = trackerData.dailyLogs[dateStr] || monthData[dateStr] || {};
        var score = 0;
        if (dayLog.water) score++;
        if (dayLog.gym) score++;
        if (dayLog.running) score++;
        if (dayLog.calories >= trackerData.calorieGoal) score++;

        var scoreClass = 'score-' + score;
        var todayClass = dateStr === todayStr ? ' monthly-today' : '';

        html += '<div class="monthly-day ' + scoreClass + todayClass + '">' +
            '<span class="monthly-day-num">' + d + '</span>' +
            (score > 0 ? '<span class="monthly-day-score">' + score + '/4</span>' : '') +
        '</div>';
    }

    container.innerHTML = html;
}

function prevMonth() {
    currentMonthView.setMonth(currentMonthView.getMonth() - 1);
    renderMonthlyCalendar();
}

function nextMonth() {
    currentMonthView.setMonth(currentMonthView.getMonth() + 1);
    renderMonthlyCalendar();
}

// ── Exercise Library ─────────────────────────────────────

async function loadExerciseLibrary() {
    try {
        var exercises = await api.get('/exercises');
        trackerData.exerciseLibrary = exercises;
        renderExerciseLibrary();
    } catch (err) {
        console.warn('Load exercises failed:', err.message);
    }
}

function renderExerciseLibrary() {
    var container = document.getElementById('exercise-library-container');
    if (!container) return;

    if (!trackerData.exerciseLibrary || trackerData.exerciseLibrary.length === 0) {
        container.innerHTML = '<p class="exercise-hint">Your exercise library will build automatically as you log workouts.</p>';
        return;
    }

    var categories = {};
    trackerData.exerciseLibrary.forEach(function(ex) {
        if (!categories[ex.category]) categories[ex.category] = [];
        categories[ex.category].push(ex);
    });

    var html = '<div class="exercise-lib-label">Exercise Library:</div>';
    var catOrder = ['Push', 'Pull', 'Legs', 'Core', 'Cardio'];
    catOrder.forEach(function(cat) {
        if (!categories[cat]) return;
        html += '<div class="exercise-category">';
        html += '<div class="exercise-cat-header">' + cat + '</div>';
        html += '<div class="exercise-chips">';
        categories[cat].forEach(function(ex) {
            var detail = '';
            if (ex.lastWeight) detail += ex.lastWeight + ' lbs';
            if (ex.lastReps) detail += (detail ? ' x ' : '') + ex.lastReps;
            var label = ex.name + (detail ? ' (' + detail + ')' : '');
            html += '<span class="exercise-chip" onclick="insertExercise(\'' + ex.name.replace(/'/g, "\\'") + '\', ' + (ex.lastWeight || 0) + ', ' + (ex.lastReps || 0) + ')">' +
                label +
                '<span class="exercise-delete" onclick="event.stopPropagation(); deleteExercise(' + ex.id + ')">&times;</span>' +
            '</span>';
        });
        html += '</div></div>';
    });

    container.innerHTML = html;
}

function insertExercise(name, weight, reps) {
    var textarea = document.getElementById('gym-exercises');
    var line = '- ' + name;
    if (weight > 0) line += ': ' + weight + ' lbs';
    if (reps > 0) line += ' x ' + reps;
    var current = textarea.value;
    textarea.value = current + (current ? '\n' : '') + line;
}

async function deleteExercise(id) {
    if (!api.isLoggedIn()) return;

    try {
        await api.delete('/exercises/' + id);
        trackerData.exerciseLibrary = trackerData.exerciseLibrary.filter(function(e) { return e.id !== id; });
        renderExerciseLibrary();
    } catch (err) {
        console.warn('Delete exercise failed:', err.message);
    }
}

async function updateExerciseLibrary(exercisesText) {
    // Parse gym text to extract exercises using regex
    var lines = exercisesText.split('\n');
    var exerciseRegex = /^[-*]\s*(.+?)(?::\s*([\d.]+)\s*(?:lbs?|kg)?\s*(?:x|X)\s*(\d+))?$/;

    var categoryMap = {
        'bench press': 'Push', 'incline press': 'Push', 'overhead press': 'Push', 'ohp': 'Push',
        'shoulder press': 'Push', 'dumbbell press': 'Push', 'push-up': 'Push', 'pushup': 'Push',
        'dips': 'Push', 'chest fly': 'Push', 'tricep': 'Push', 'skull crusher': 'Push',
        'pull-up': 'Pull', 'pullup': 'Pull', 'chin-up': 'Pull', 'chinup': 'Pull',
        'row': 'Pull', 'lat pulldown': 'Pull', 'deadlift': 'Pull', 'curl': 'Pull',
        'face pull': 'Pull', 'barbell row': 'Pull', 'cable row': 'Pull',
        'squat': 'Legs', 'leg press': 'Legs', 'lunge': 'Legs', 'leg curl': 'Legs',
        'leg extension': 'Legs', 'calf raise': 'Legs', 'hip thrust': 'Legs',
        'romanian deadlift': 'Legs', 'rdl': 'Legs', 'goblet squat': 'Legs',
        'plank': 'Core', 'crunch': 'Core', 'sit-up': 'Core', 'situp': 'Core',
        'ab': 'Core', 'russian twist': 'Core', 'leg raise': 'Core', 'cable crunch': 'Core',
        'run': 'Cardio', 'jog': 'Cardio', 'bike': 'Cardio', 'cycling': 'Cardio',
        'swim': 'Cardio', 'elliptical': 'Cardio', 'stairmaster': 'Cardio', 'jump rope': 'Cardio'
    };

    function guessCategory(name) {
        var lower = name.toLowerCase();
        for (var keyword in categoryMap) {
            if (lower.indexOf(keyword) !== -1) return categoryMap[keyword];
        }
        return 'Push'; // default
    }

    for (var i = 0; i < lines.length; i++) {
        var match = lines[i].trim().match(exerciseRegex);
        if (match) {
            var exName = match[1].trim();
            var exWeight = match[2] ? parseFloat(match[2]) : null;
            var exReps = match[3] ? parseInt(match[3]) : null;
            var category = guessCategory(exName);

            try {
                await api.post('/exercises', {
                    name: exName,
                    category: category,
                    lastWeight: exWeight,
                    lastReps: exReps
                });
            } catch (err) {
                console.warn('Exercise upsert failed:', err.message);
            }
        }
    }

    // Reload library
    await loadExerciseLibrary();
}

// ── Progress Photos ──────────────────────────────────────

var viewingPhotoId = null;

async function loadProgressPhotos() {
    try {
        var photos = await api.get('/photos');
        trackerData.progressPhotos = photos;
        renderProgressPhotos();
    } catch (err) {
        console.warn('Load photos failed:', err.message);
    }
}

function renderProgressPhotos() {
    var container = document.getElementById('photos-gallery');
    if (!container) return;

    if (!trackerData.progressPhotos || trackerData.progressPhotos.length === 0) {
        container.innerHTML = '<p style="color:#999; padding:10px;">No progress photos yet.</p>';
        return;
    }

    var html = '';
    trackerData.progressPhotos.forEach(function(photo) {
        var dateStr = new Date(photo.photoDate).toLocaleDateString();
        var weightLabel = photo.weightAtTime ? photo.weightAtTime + ' lbs' : '';
        html += '<div class="photo-card" onclick="viewPhoto(' + photo.id + ')">' +
            '<div class="photo-card-date">' + dateStr + '</div>' +
            (weightLabel ? '<div class="photo-card-weight">' + weightLabel + '</div>' : '') +
            (photo.notes ? '<div class="photo-card-notes">' + photo.notes + '</div>' : '') +
        '</div>';
    });
    container.innerHTML = html;
}

async function viewPhoto(id) {
    viewingPhotoId = id;
    try {
        var photo = await api.get('/photos/' + id);
        document.getElementById('photo-view-img').src = photo.imageData;
        var details = '<strong>' + new Date(photo.photoDate).toLocaleDateString() + '</strong>';
        if (photo.weightAtTime) details += ' | ' + photo.weightAtTime + ' lbs';
        if (photo.notes) details += '<br>' + photo.notes;
        document.getElementById('photo-view-details').innerHTML = details;
        showModal('photo-view-modal');
    } catch (err) {
        alert('Failed to load photo');
    }
}

function previewPhoto(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var preview = document.getElementById('photo-preview');
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function compressAndEncodeImage(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var maxSize = 800;
                var width = img.width;
                var height = img.height;

                if (width > height && width > maxSize) {
                    height = Math.round(height * maxSize / width);
                    width = maxSize;
                } else if (height > maxSize) {
                    width = Math.round(width * maxSize / height);
                    height = maxSize;
                }

                canvas.width = width;
                canvas.height = height;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                var dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function uploadProgressPhoto() {
    var fileInput = document.getElementById('photo-file-input');
    var photoDate = document.getElementById('photo-date-input').value;
    var notes = document.getElementById('photo-notes').value;
    var weightAtTime = parseFloat(document.getElementById('photo-weight').value) || null;

    if (!fileInput.files || !fileInput.files[0]) {
        alert('Please select a photo!');
        return;
    }

    if (!photoDate) {
        photoDate = getTodayString();
    }

    if (!api.isLoggedIn()) return;

    try {
        var imageData = await compressAndEncodeImage(fileInput.files[0]);
        var result = await api.post('/photos', {
            imageData: imageData,
            photoDate: photoDate,
            notes: notes,
            weightAtTime: weightAtTime
        });

        trackerData.progressPhotos.unshift(result);
        renderProgressPhotos();
        closeModal('photo-upload-modal');

        // Reset form
        fileInput.value = '';
        document.getElementById('photo-preview').style.display = 'none';
        document.getElementById('photo-date-input').value = '';
        document.getElementById('photo-notes').value = '';
        document.getElementById('photo-weight').value = '';

        addActivity('Uploaded progress photo');
    } catch (err) {
        alert('Upload failed: ' + err.message);
    }
}

async function deleteViewedPhoto() {
    if (!viewingPhotoId || !confirm('Delete this photo?')) return;

    try {
        await api.delete('/photos/' + viewingPhotoId);
        trackerData.progressPhotos = trackerData.progressPhotos.filter(function(p) { return p.id !== viewingPhotoId; });
        renderProgressPhotos();
        closeModal('photo-view-modal');
        viewingPhotoId = null;
        addActivity('Deleted progress photo');
    } catch (err) {
        alert('Delete failed: ' + err.message);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (api.isLoggedIn()) {
        hideAuthOverlay();
        loadData();
    } else {
        showAuthOverlay();
    }
});

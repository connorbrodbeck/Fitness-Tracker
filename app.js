// Initialize data structure
let trackerData = {
    currentWeight: 145,
    goalWeight: 180,
    startWeight: 145,
    calorieGoal: 3000,
    dailyLogs: {},
    weightHistory: [],
    personalRecords: {},
    bestStreak: 0
};

// Load data from localStorage
function loadData() {
    const saved = localStorage.getItem('fitnessTrackerData');
    if (saved) {
        trackerData = JSON.parse(saved);
    }
    updateDashboard();
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('fitnessTrackerData', JSON.stringify(trackerData));
}

// Get today's date string
function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Get date string for a given date
function getDateString(date) {
    return date.toISOString().split('T')[0];
}

// Initialize today's log if it doesn't exist
function initTodayLog() {
    const today = getTodayString();
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
    let score = 0;
    if (dayLog.water) score++;
    if (dayLog.gym) score++;
    if (dayLog.running) score++;
    if (dayLog.calories >= trackerData.calorieGoal) score++;
    return score >= 3;
}

// Calculate current streak
function calculateStreak() {
    let streak = 0;
    const today = new Date();

    // Check if today is complete; if not, start from yesterday
    const todayLog = trackerData.dailyLogs[getTodayString()];
    let startOffset = isDayComplete(todayLog) ? 0 : 1;

    for (let i = startOffset; i < 365; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = getDateString(date);
        const dayLog = trackerData.dailyLogs[dateStr];

        if (isDayComplete(dayLog)) {
            streak++;
        } else {
            break;
        }
    }

    if (streak > trackerData.bestStreak) {
        trackerData.bestStreak = streak;
        saveData();
    }

    return streak;
}

// Toggle water completion
function toggleWater() {
    const todayLog = initTodayLog();
    todayLog.water = !todayLog.water;
    saveData();
    updateDashboard();
    addActivity(todayLog.water ? 'Drank a gallon of water!' : 'Unmarked water intake');
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
function saveGymSession() {
    const exercises = document.getElementById('gym-exercises').value;
    const prs = document.getElementById('gym-prs').value;

    if (!exercises) {
        alert('Please enter your exercises!');
        return;
    }

    const todayLog = initTodayLog();
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
}

// Save run
function saveRun() {
    const distance = parseFloat(document.getElementById('run-distance-input').value);
    const pace = document.getElementById('run-pace').value;
    const duration = parseInt(document.getElementById('run-duration').value);

    if (!distance || !pace) {
        alert('Please enter distance and pace!');
        return;
    }

    const todayLog = initTodayLog();
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
}

// Save meal
function saveMeal() {
    const mealName = document.getElementById('meal-name').value;
    const calories = parseInt(document.getElementById('meal-calories').value);

    if (!mealName || !calories) {
        alert('Please enter meal name and calories!');
        return;
    }

    const todayLog = initTodayLog();
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
}

// Save weight
function saveWeight() {
    const weight = parseFloat(document.getElementById('weight-input').value);

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
}

// Add activity to log
function addActivity(message) {
    const activityLog = document.getElementById('activity-log');
    const timestamp = new Date().toLocaleString();
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = '<strong>' + timestamp + '</strong><br>' + message;
    activityLog.insertBefore(activityItem, activityLog.firstChild);
}

// Update dashboard display
function updateDashboard() {
    const todayLog = initTodayLog();

    // Update current date
    const today = new Date();
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
    var weightGained = trackerData.currentWeight - trackerData.startWeight;
    var totalToGain = trackerData.goalWeight - trackerData.startWeight;
    var weightRemaining = trackerData.goalWeight - trackerData.currentWeight;
    var progressPercent = (weightGained / totalToGain) * 100;

    document.getElementById('weight-gained').textContent = weightGained.toFixed(1);
    document.getElementById('weight-remaining').textContent = weightRemaining.toFixed(1);
    document.getElementById('weight-progress').style.width = Math.max(0, Math.min(progressPercent, 100)) + '%';

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
function resetDay() {
    if (confirm('Are you sure you want to reset today\'s data?')) {
        var today = getTodayString();
        delete trackerData.dailyLogs[today];
        saveData();
        updateDashboard();
        addActivity('Reset today\'s data');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadData);

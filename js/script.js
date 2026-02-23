// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAxrzTbnFmcc3TS5MfIYg8GTl4B5jFpuYI",
    authDomain: "drohne-e34ef.firebaseapp.com",
    projectId: "drohne-e34ef",
    storageBucket: "drohne-e34ef.appspot.com",
    messagingSenderId: "418105868792",
    appId: "1:418105868792:web:abc123" // ← optional, falls vorhanden
};

// Initialize Firebase — with retry for deferred script loading
let firebaseReady = false;

function initFirebase() {
    if (typeof firebase !== 'undefined' && !firebaseReady) {
        try {
            firebase.initializeApp(firebaseConfig);
            firebaseReady = true;
            console.log("Firebase initialized successfully");
        } catch (e) {
            // Already initialized
            if (e.code === 'app/duplicate-app') {
                firebaseReady = true;
            } else {
                console.error("Firebase init error:", e);
            }
        }
    }
}

// Try immediately
initFirebase();

// If Firebase SDK wasn't ready yet, poll until it is
if (!firebaseReady) {
    let firebaseRetries = 0;
    const firebaseTimer = setInterval(() => {
        firebaseRetries++;
        if (typeof firebase !== 'undefined') {
            initFirebase();
            clearInterval(firebaseTimer);
            // Firebase just became ready → reload appointments into calendar
            console.log("Firebase loaded after " + (firebaseRetries * 200) + "ms — reloading appointments");
            generatePublicCalendar(publicCurrentYear, publicCurrentMonth);
        } else if (firebaseRetries > 50) { // 10 seconds max
            clearInterval(firebaseTimer);
            console.error("Firebase SDK did not load within 10 seconds");
        }
    }, 200);
}

/* --- Easter Egg: 5x Logo Click → Admin Login --- */

let logoClickCount = 0;
let logoClickTimer = null;

function initLogoEasterEgg() {
    const logo = document.getElementById('site-logo');
    if (!logo) return;

    logo.addEventListener('click', () => {
        logoClickCount++;

        // Kleines visuelles Feedback: Logo kurz pulsieren
        logo.style.transform = 'scale(1.15)';
        setTimeout(() => { logo.style.transform = 'scale(1)'; }, 150);

        // Timer zurücksetzen – nach 2s ohne Klick wird der Counter reset
        clearTimeout(logoClickTimer);
        logoClickTimer = setTimeout(() => {
            logoClickCount = 0;
        }, 2000);

        // Bei 5 Klicks: Login-Modal öffnen
        if (logoClickCount >= 5) {
            logoClickCount = 0;
            clearTimeout(logoClickTimer);
            showAdminLogin();
        }
    });
}

/* --- Admin Functions --- */

function showAdminLogin() {
    const modal = document.getElementById('admin-login-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('opacity-100');
    }, 10);
}

function closeAdminLogin() {
    const modal = document.getElementById('admin-login-modal');
    modal.classList.remove('opacity-100');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

async function checkAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        localStorage.setItem('adminLoggedIn', 'true');
        closeAdminLogin();
        showAdminCalendar();
    } catch (error) {
        alert('Login fehlgeschlagen: ' + error.message);
    }
    return false;
}

async function showAdminCalendar() {
    const calendar = document.getElementById('admin-calendar');
    calendar.classList.remove('hidden');
    setTimeout(() => {
        calendar.classList.add('opacity-100');
    }, 10);
    await generateCalendar(new Date());
}

function closeAdminCalendar() {
    const calendar = document.getElementById('admin-calendar');
    calendar.classList.remove('opacity-100');
    setTimeout(() => {
        calendar.classList.add('hidden');
    }, 300);
    firebase.auth().signOut();
    localStorage.removeItem('adminLoggedIn');
}


/* --- Calendar Functions --- */

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

let publicCurrentMonth = new Date().getMonth();
let publicCurrentYear = new Date().getFullYear();

// Initialize public calendar
function initPublicCalendar() {
    generatePublicCalendar(publicCurrentYear, publicCurrentMonth);
}

async function generatePublicCalendar(year, month) {
    const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember"];

    const monthEl = document.getElementById('public-current-month');
    if (monthEl) {
        monthEl.textContent = `${monthNames[month]} ${year}`;
    }

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let days = "";

    // 1. Render Structure IMMEDIATELY (Synchronous)
    const firstDayOfWeek = firstDay.getDay(); // 0=Sunday, 1=Monday, etc.
    let emptyDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Adjust for Monday start
    for (let i = 0; i < emptyDays; i++) {
        days += `<div class="cal-cell cal-cell--empty"></div>`;
    }

    const today = new Date();

    for (let i = 1; i <= lastDay.getDate(); i++) {
        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(i).padStart(2, '0');
        const dateString = `${year}-${monthStr}-${dayStr}`;

        const isToday = year === today.getFullYear() && month === today.getMonth() && i === today.getDate();
        const todayClass = isToday ? " cal-cell--today" : "";

        days += `<div id="day-${dateString}" class="cal-cell${todayClass}">
            <span class="cal-day-number">${i}</span>
            <div class="cal-dot-wrap"></div>
        </div>`;
    }

    const calendarDays = document.getElementById('public-calendar-days');
    if (calendarDays) calendarDays.innerHTML = days;

    // 2. Fetch Data Asynchronously
    try {
        if (firebaseReady) {
            const appointments = await getAppointmentsForMonth(year, month);

            appointments.forEach(app => {
                const cell = document.getElementById(`day-${app.date}`);
                if (cell) {
                    cell.classList.add('cal-cell--booked');
                    const dotWrap = cell.querySelector('.cal-dot-wrap');
                    if (dotWrap && dotWrap.innerHTML === "") {
                        dotWrap.innerHTML = `<span class="cal-dot"></span>`;
                    }
                }
            });
        } else {
            console.log("Firebase not ready yet — appointments will load when ready");
        }
    } catch (e) {
        console.log("Could not fetch appointments (Firebase might not be ready or offline)", e);
    }
}

function prevPublicMonth() {
    publicCurrentMonth--;
    if (publicCurrentMonth < 0) {
        publicCurrentMonth = 11;
        publicCurrentYear--;
    }
    generatePublicCalendar(publicCurrentYear, publicCurrentMonth);
}

function nextPublicMonth() {
    publicCurrentMonth++;
    if (publicCurrentMonth > 11) {
        publicCurrentMonth = 0;
        publicCurrentYear++;
    }
    generatePublicCalendar(publicCurrentYear, publicCurrentMonth);
}

async function generateCalendar(date) {
    const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember"];

    const year = date.getFullYear();
    const month = date.getMonth();

    document.getElementById('current-month').textContent =
        `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let days = "";

    // Optimization: Fetch all appointments for the month at once
    let appointmentsMap = new Map();
    try {
        if (typeof firebase !== 'undefined') {
            const appointments = await getAppointmentsForMonth(year, month);
            // Map appointments by date string "YYYY-MM-DD"
            appointments.forEach(app => {
                if (!appointmentsMap.has(app.date)) {
                    appointmentsMap.set(app.date, []);
                }
                appointmentsMap.get(app.date).push(app);
            });
        }
    } catch (e) {
        console.log("Could not fetch appointments (Firebase might not be ready)", e);
    }

    // Add empty cells for days before the first day of month
    const firstDayOfWeek = firstDay.getDay();
    let emptyDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    for (let i = 0; i < emptyDays; i++) {
        days += `<div class="h-24 border border-gray-200 bg-gray-100"></div>`;
    }

    const today = new Date();

    // Add cells for each day of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
        // Construct date string manually: YYYY-MM-DD
        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(i).padStart(2, '0');
        const dateString = `${year}-${monthStr}-${dayStr}`;

        const appointments = appointmentsMap.get(dateString) || [];

        let appointmentHtml = "";
        appointments.forEach(app => {
            // Check if app.date is defined to avoid errors (though it should be if in the map)
            const safeDate = app.date || dateString;
            // Find the index in the original list if needed, or just pass ID if we refactor deleteAppointment
            // For now, we need the index relative to the day's list or the global list?
            // The original code used global fetching for day, so index was relative to that day's list. 
            // BUT wait, deleteAppointment uses (dateStr, index). 
            // We must ensure the index matches what getAppointmentsForDate would return.
            // Since we simply filtered by date, the order should be preserved if filtered correctly.
            // Let's rely on the order in appointmentsMap.get(dateString).
            appointmentHtml += `<div class="text-xs p-1 mb-1 bg-blue-100 text-blue-800 rounded truncate flex justify-between items-center group">
                <span>${app.time} - ${app.name}</span>
                <button onclick="deleteAppointment('${safeDate}', ${appointments.indexOf(app)})" class="text-red-500 hover:text-red-700 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>`;
        });

        const isToday = year === today.getFullYear() && month === today.getMonth() && i === today.getDate();
        const dayClass = `h-24 border border-gray-200 p-1 overflow-auto transition hover:bg-gray-50${isToday ? ' calendar-today' : ''}`;

        days += `<div class="${dayClass}">
            <div class="font-medium text-gray-700 mb-1">${i}</div>
            ${appointmentHtml}
        </div>`;
    }

    document.getElementById('calendar-days').innerHTML = days;
}

function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    generateCalendar(new Date(currentYear, currentMonth, 1));
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    generateCalendar(new Date(currentYear, currentMonth, 1));
}

/* --- Firebase Data Functions --- */

async function getAppointments() {
    const snapshot = await firebase.firestore().collection('appointments').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function saveAppointment(appointment) {
    await firebase.firestore().collection('appointments').add(appointment);
}

async function getAppointmentsForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    const snapshot = await firebase.firestore().collection('appointments')
        .where('date', '==', dateStr)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getAppointmentsForMonth(year, month) {
    // Construct start and end dates for the query
    // Start: YYYY-MM-01
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;

    // End: YYYY-MM-LastDay
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

    const snapshot = await firebase.firestore().collection('appointments')
        .where('date', '>=', startStr)
        .where('date', '<=', endStr)
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function deleteAppointment(dateStr, index) {
    if (!confirm('Möchten Sie diesen Termin wirklich löschen?')) return;

    try {
        const snapshot = await firebase.firestore().collection('appointments')
            .where('date', '==', dateStr)
            .get();

        if (snapshot.docs.length > index) {
            const docId = snapshot.docs[index].id;
            await firebase.firestore().collection('appointments').doc(docId).delete();
            generateCalendar(new Date(currentYear, currentMonth, 1));
            alert('Termin erfolgreich gelöscht!');
        } else {
            throw new Error('Termin nicht gefunden');
        }
    } catch (error) {
        console.error('Fehler beim Löschen:', error);
        alert('Fehler beim Löschen des Termins: ' + error.message);
    }
}

/* --- UI Interaction Functions --- */

// Service content definitions
const serviceContents = {
    'Immobilienvideografie': `
        <p class="mb-2">Unsere Immobilienvideografie bietet Ihnen atemberaubende Luftaufnahmen Ihrer Immobilien, die potenzielle Käufer oder Mieter beeindrucken werden.</p>
        <p class="mb-2"><strong>Vorteile:</strong></p>
        <ul class="list-disc pl-5 space-y-2 mb-4">
            <li>Präsentation des gesamten Grundstücks aus der Vogelperspektive</li>
            <li>Hervorhebung der Lage und Umgebung</li>
            <li>Professionelle Nachbearbeitung für optimalen Eindruck</li>
            <li>Individuelle Gestaltung nach Ihren Wünschen</li>
        </ul>
        <p>Ideal für Makler, Bauträger und private Verkäufer, die ihre Immobilie optimal präsentieren möchten.</p>
    `,
    'Hochzeitsfilme': `
        <p class="mb-2">Verleihen Sie Ihrem Hochzeitsfilm eine besondere Perspektive mit unseren Drohnenaufnahmen.</p>
        <p class="mb-2"><strong>Was wir bieten:</strong></p>
        <ul class="list-disc pl-5 space-y-2 mb-4">
            <li>Atemberaubende Aufnahmen Ihrer Hochzeitslocation</li>
            <li>Luftaufnahmen des Brautpaares und der Gäste</li>
            <li>Professionelle Schnitt- und Nachbearbeitung</li>
            <li>Kombination mit Bodenaufnahmen möglich</li>
            <li>Individuelle musikalische Untermalung</li>
        </ul>
        <p>Erhalten Sie einen Film, der Ihren besonderen Tag perfekt einfängt und Ihnen lebenslange Erinnerungen schenkt.</p>
    `,
    'Eventdokumentation': `
        <p class="mb-2">Machen Sie Ihre Veranstaltung unvergesslich mit spektakulären Luftaufnahmen.</p>
        <p class="mb-2"><strong>Unsere Leistungen:</strong></p>
        <ul class="list-disc pl-5 space-y-2 mb-4">
            <li>Dynamische Aufnahmen von Großveranstaltungen</li>
            <li>Einzigartige Perspektiven für Sportevents</li>
            <li>Beeindruckende Aufnahmen von Firmenfeiern</li>
            <li>Professionelle Nachbearbeitung mit Ihrem Branding</li>
            <li>Optionale Live-Übertragung</li>
        </ul>
        <p>Perfekt für Eventmanager, Marketingabteilungen und Veranstalter, die ihren Gästen etwas Besonderes bieten möchten.</p>
    `
};

function showServicePopup(serviceName) {
    const popup = document.getElementById('service-popup');
    const popupTitle = document.getElementById('popup-title');
    const popupContent = document.getElementById('popup-content');

    if (popupTitle) popupTitle.textContent = serviceName;
    if (popupContent) popupContent.innerHTML = serviceContents[serviceName] || '<p>Keine Details verfügbar.</p>';

    popup.classList.remove('hidden');
    setTimeout(() => {
        popup.classList.add('opacity-100');
    }, 10);
    document.body.style.overflow = 'hidden';
}



function closeServicePopup() {
    const popup = document.getElementById('service-popup');
    popup.classList.remove('opacity-100');
    setTimeout(() => {
        popup.classList.add('hidden');
    }, 300);
    document.body.style.overflow = 'auto';
}

function buyPortfolioVideo(title, price) {
    // Scroll zum Formular
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });

    // Felder ausblenden
    const fieldsToHide = ['location', 'date', 'time', 'phone', 'service'];
    fieldsToHide.forEach(name => {
        const field = document.querySelector(`#booking-form [name="${name}"]`);
        const label = document.querySelector(`label[for="${name}"]`);
        const wrapper = field?.closest('div');

        if (wrapper) wrapper.style.display = 'none';
        if (label) label.style.display = 'none';

        // Pflicht-Attribute entfernen
        if (field) field.removeAttribute('required');
    });

    // Pflichtfelder reduzieren
    ['name', 'email', 'details'].forEach(name => {
        const field = document.querySelector(`#booking-form [name="${name}"]`);
        if (field) field.setAttribute('required', '');
    });

    // Details vorausfüllen
    const detailsField = document.querySelector('#booking-form [name="details"]');
    if (detailsField) detailsField.value = `Ich möchte gerne das Portfolio-Video "${title}" für ${price} € kaufen.`;

    // Optional: Hinweis einblenden
    const previousHint = document.getElementById('portfolio-hint');
    if (previousHint) previousHint.remove();

    const hint = document.createElement('div');
    hint.id = 'portfolio-hint';
    hint.className = 'mb-4 p-3 bg-blue-100 text-blue-800 rounded';
    hint.innerText = `Portfolio-Video: "${title}" – ${price} €`;
    const form = document.getElementById('booking-form');
    form.insertBefore(hint, form.firstChild);
}

// Email sending function
async function sendEmail(e) {
    if (e) e.preventDefault();
    const form = document.getElementById('booking-form');
    const formData = new FormData(form);
    const formValues = Object.fromEntries(formData.entries());

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Wird gesendet...';
    submitBtn.disabled = true;

    // Send data to server
    fetch('https://formspree.io/f/mvgqpzbk', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: formValues.name,
            email: formValues.email,
            phone: formValues.phone,
            location: formValues.location,
            date: formValues.date,
            time: formValues.time,
            service: formValues.service,
            details: formValues.details,
            _replyto: formValues.email,
            _subject: `Neue Anfrage von ${formValues.name}`
        })
    })
        .then(response => {
            if (response.ok) {
                // Show success message
                document.getElementById('form-success').classList.remove('hidden');
                form.reset();

                // Restore hidden fields if they were hidden by portfolio buy
                const fieldsToRestore = ['location', 'date', 'time', 'phone', 'service'];
                fieldsToRestore.forEach(name => {
                    const field = document.querySelector(`#booking-form [name="${name}"]`);
                    const label = document.querySelector(`label[for="${name}"]`);
                    const wrapper = field?.closest('div');
                    if (wrapper) wrapper.style.display = 'block';
                    if (label) label.style.display = 'block';
                    if (field && name !== 'phone' && name !== 'time') field.setAttribute('required', '');
                });
                const hint = document.getElementById('portfolio-hint');
                if (hint) hint.remove();

                // Scroll to success message
                setTimeout(() => {
                    document.getElementById('form-success').scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } else {
                throw new Error('Fehler beim Senden der Anfrage');
            }
        })
        .catch(error => {
            alert('Es gab ein Problem beim Senden Ihrer Anfrage. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt per Telefon.');
            console.error('Error:', error);
        })
        .finally(() => {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        });

    return false;
}

/* --- Initialization --- */

document.addEventListener('DOMContentLoaded', () => {
    // Easter Egg: 5x Logo klicken → Admin Login
    initLogoEasterEgg();

    // Admin login form
    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) adminLoginForm.addEventListener('submit', checkAdminLogin);

    // Appointment form
    const addAppointForm = document.getElementById('add-appointment-form');
    if (addAppointForm) {
        addAppointForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const appointment = {
                date: new Date(document.getElementById('appointment-date').value).toISOString().split('T')[0],
                time: document.getElementById('appointment-time').value,
                name: document.getElementById('appointment-name').value,
                service: document.getElementById('appointment-service').value,
                notes: document.getElementById('appointment-notes').value,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                await saveAppointment(appointment);
                generateCalendar(new Date(currentYear, currentMonth, 1));
                this.reset();
                alert('Termin erfolgreich gespeichert!');
            } catch (error) {
                alert('Fehler beim Speichern: ' + error.message);
            }
        });
    }

    // Booking form
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) bookingForm.addEventListener('submit', sendEmail);

    // Mobile menu
    const mobileBtn = document.getElementById('mobile-menu-button');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', function () {
            const menu = document.getElementById('mobile-menu');
            menu.classList.toggle('hidden');
        });
    }

    // FAQ accordion
    document.querySelectorAll('.faq-question').forEach(button => {
        button.addEventListener('click', () => {
            const answer = button.nextElementSibling;
            const icon = button.querySelector('i');

            if (answer.classList.contains('hidden')) {
                answer.classList.remove('hidden');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                answer.style.maxHeight = '0';
                setTimeout(() => answer.classList.add('hidden'), 300);
            }

            icon.classList.toggle('transform');
            icon.classList.toggle('rotate-180');
        });
    });

    // Close popup events
    const closePopupBtn = document.getElementById('close-popup');
    if (closePopupBtn) closePopupBtn.addEventListener('click', closeServicePopup);

    const servicePopup = document.getElementById('service-popup');
    if (servicePopup) {
        servicePopup.addEventListener('click', function (e) {
            if (e.target === this) {
                closeServicePopup();
            }
        });
    }


    // Scroll Fade-In
    const sections = document.querySelectorAll('section');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('section-show');
            }
        });
    }, { threshold: 0 }); // Changed from 0.1 to 0 for better mobile detection

    sections.forEach(section => {
        // Exclude calendar from animation to ensure it's always visible on mobile
        if (section.id === 'calendar') return;

        section.classList.add('section-hidden');
        observer.observe(section);
    });

    // Fallback: Force all sections to show after 1 second (safety for mobile)
    setTimeout(() => {
        sections.forEach(section => {
            if (!section.classList.contains('section-show')) {
                section.classList.add('section-show');
            }
        });
    }, 1000);

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
                const mobileMenu = document.getElementById('mobile-menu');
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                }
            }
        });
    });

    // Theme toggle
    const toggle = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-icon');
    const body = document.body;

    if (localStorage.theme === 'dark') {
        body.classList.add('dark');
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }

    if (toggle) {
        toggle.addEventListener('click', () => {
            body.classList.toggle('dark');
            if (body.classList.contains('dark')) {
                localStorage.theme = 'dark';
                if (icon) {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                }
            } else {
                localStorage.theme = 'light';
                if (icon) {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                }
            }
        });
    }

    // Safe Back to Top Logic
    const backToTopBtn = document.getElementById('back-to-top');

    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.remove('hidden');
                setTimeout(() => {
                    backToTopBtn.classList.remove('opacity-0', 'translate-y-10');
                }, 10);
            } else {
                backToTopBtn.classList.add('opacity-0', 'translate-y-10');
                setTimeout(() => {
                    if (window.scrollY <= 300) backToTopBtn.classList.add('hidden');
                }, 300);
            }

            // Header Optimization
            const nav = document.querySelector('nav');
            if (nav) {
                if (window.scrollY > 50) {
                    nav.classList.add('py-0', 'shadow-md');
                    nav.classList.remove('py-2');
                } else {
                    nav.classList.remove('py-0', 'shadow-md');
                }
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Safe Cookie Banner Logic
    const cookieBanner = document.getElementById('cookie-banner');
    const acceptCookiesBtn = document.getElementById('accept-cookies');

    if (cookieBanner && !localStorage.getItem('cookiesAccepted')) {
        setTimeout(() => {
            cookieBanner.classList.remove('hidden');
        }, 1000);
    }

    if (acceptCookiesBtn) {
        acceptCookiesBtn.addEventListener('click', () => {
            localStorage.setItem('cookiesAccepted', 'true');
            if (cookieBanner) {
                cookieBanner.classList.add('opacity-0');
                setTimeout(() => {
                    cookieBanner.classList.add('hidden');
                }, 500);
            }
        });
    }

    // Safe Leaflet Map initialization
    if (document.getElementById('coverage-map') && typeof L !== 'undefined') {
        try {
            const map = L.map('coverage-map').setView([54.0924413, 12.0795075], 11);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            L.circle([54.0924413, 12.0795075], {
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.2,
                radius: 20000
            }).addTo(map);

            L.marker([54.0924413, 12.0795075]).addTo(map)
                .bindPopup('Rostock<br>20km Radius')
                .openPopup();
        } catch (e) {
            console.error("Map initialization failed:", e);
        }
    }

    // Initialize calendar
    initPublicCalendar();
});

// Fallback: Ensure calendar loads even if DOMContentLoaded missed or Firebase late
window.addEventListener('load', () => {
    // Fallback 1: Calendar structure never rendered
    setTimeout(() => {
        const monthEl = document.getElementById('public-current-month');
        if (monthEl && monthEl.textContent === 'Lade Kalender...') {
            console.log("Fallback: Initializing calendar structure...");
            initPublicCalendar();
        }
    }, 1000);

    // Fallback 2: Calendar rendered but appointments might not have loaded
    // (Firebase might have been late on slow mobile connections)
    setTimeout(() => {
        if (firebaseReady) {
            const hasBookedCells = document.querySelector('.cal-cell--booked');
            if (!hasBookedCells) {
                console.log("Fallback: Reloading appointments (Firebase ready but no booked cells found)...");
                generatePublicCalendar(publicCurrentYear, publicCurrentMonth);
            }
        }
    }, 3000);

    // Fallback 3: Last resort — try again after 6 seconds
    setTimeout(() => {
        if (typeof firebase !== 'undefined') {
            initFirebase();
            const hasBookedCells = document.querySelector('.cal-cell--booked');
            if (!hasBookedCells) {
                console.log("Fallback: Final attempt to load appointments...");
                generatePublicCalendar(publicCurrentYear, publicCurrentMonth);
            }
        }
    }, 6000);
});

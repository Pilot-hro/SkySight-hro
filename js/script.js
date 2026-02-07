// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAxrzTbnFmcc3TS5MfIYg8GTl4B5jFpuYI",
    authDomain: "drohne-e34ef.firebaseapp.com",
    projectId: "drohne-e34ef",
    storageBucket: "drohne-e34ef.appspot.com",
    messagingSenderId: "418105868792",
    appId: "1:418105868792:web:abc123" // ← optional, falls vorhanden
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();
} else {
    console.error("Firebase SDK not loaded");
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
        // Store login state in localStorage
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
    // Optional: Sign out when closing calendar
    firebase.auth().signOut();
    localStorage.removeItem('adminLoggedIn');
}

/* --- Calendar Functions --- */

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Initialize public calendar
function initPublicCalendar() {
    generatePublicCalendar(new Date());
}

async function generatePublicCalendar(date) {
    const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember"];

    // Adjust for UTC+2 timezone
    const adjustedDate = new Date(date);
    adjustedDate.setHours(date.getHours() + 2);

    const monthEl = document.getElementById('public-current-month');
    if (monthEl) {
        monthEl.textContent = `${monthNames[adjustedDate.getMonth()]} ${adjustedDate.getFullYear()}`;
    }

    const firstDay = new Date(adjustedDate.getFullYear(), adjustedDate.getMonth(), 1);
    const lastDay = new Date(adjustedDate.getFullYear(), adjustedDate.getMonth() + 1, 0);

    let days = "";

    // Add empty cells for days before the first day of month
    // Using Monday as first day (1) in JavaScript Date
    const firstDayOfWeek = firstDay.getDay(); // 0=Sunday, 1=Monday, etc.
    let emptyDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Adjust for Monday start
    for (let i = 0; i < emptyDays; i++) {
        days += `<div class="h-16 border border-gray-200 bg-gray-100"></div>`;
    }

    // Add cells for each day of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
        // Create date in local timezone (UTC+2)
        const currentDate = new Date(adjustedDate.getFullYear(), adjustedDate.getMonth(), i);
        currentDate.setHours(12, 0, 0, 0); // Set to midday to avoid timezone issues

        let appointments = [];
        try {
            if (typeof firebase !== 'undefined') {
                appointments = await getAppointmentsForDate(currentDate);
            }
        } catch (e) {
            console.log("Could not fetch appointments (Firebase might not be ready)", e);
        }

        let dayClass = "h-16 border border-gray-200 p-1 overflow-hidden";
        if (appointments.length > 0) {
            dayClass += " bg-blue-50";
        }

        days += `<div class="${dayClass}">
            <div class="font-medium">${i}</div>
            ${appointments.length > 0 ? '<div class="text-xs text-blue-600">Termin gebucht</div>' : ''}
        </div>`;
    }

    const calendarDays = document.getElementById('public-calendar-days');
    if (calendarDays) calendarDays.innerHTML = days;
}

async function generateCalendar(date) {
    const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember"];

    document.getElementById('current-month').textContent =
        `${monthNames[date.getMonth()]} ${date.getYear() + 1900}`;

    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    let days = "";

    // Add empty cells for days before the first day of month
    const firstDayOfWeek = firstDay.getDay();
    let emptyDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    for (let i = 0; i < emptyDays; i++) {
        days += `<div class="h-24 border border-gray-200 bg-gray-100"></div>`;
    }

    // Add cells for each day of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const currentDate = new Date(date.getFullYear(), date.getMonth(), i);
        currentDate.setHours(12, 0, 0, 0);
        const appointments = await getAppointmentsForDate(currentDate);

        let appointmentHtml = "";
        appointments.forEach(app => {
            appointmentHtml += `<div class="text-xs p-1 mb-1 bg-blue-100 text-blue-800 rounded truncate flex justify-between items-center">
                <span>${app.time} - ${app.name}</span>
                <button onclick="deleteAppointment('${app.date}', ${appointments.indexOf(app)})" class="text-red-500 hover:text-red-700 ml-2">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>`;
        });

        days += `<div class="h-24 border border-gray-200 p-1 overflow-auto">
            <div class="font-medium">${i}</div>
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

function showPrivacyModal() {
    const modal = document.getElementById('privacy-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('opacity-100');
    }, 10);
    document.body.style.overflow = 'hidden';
}

function closePrivacyModal() {
    const modal = document.getElementById('privacy-modal');
    modal.classList.remove('opacity-100');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
    document.body.style.overflow = 'auto';
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

    const privacyModal = document.getElementById('privacy-modal');
    if (privacyModal) {
        privacyModal.addEventListener('click', function (e) {
            if (e.target === this) {
                closePrivacyModal();
            }
        });
    }

    // Leaflet Map
    if (document.getElementById('coverage-map')) {
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
    }

    // Scroll Fade-In
    const sections = document.querySelectorAll('section');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('section-show');
            }
        });
    }, { threshold: 0.1 });

    sections.forEach(section => {
        section.classList.add('section-hidden');
        observer.observe(section);
    });

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

    // Initialize calendar
    initPublicCalendar();
});

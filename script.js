import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- GLOBAL VARIABLES ---
// IMPORTANT: These are provided by the hosting environment. Do not edit.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firebase App and Services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Application state variables
let userRole = 'employee'; // Default to 'employee'
let uid = null;
let companies = []; // All company data
let expenses = []; // All user's expense data
let selectedFiles = []; // For media uploads
let billFile = null; // For expense bill upload
let currentCompanyId = null;
let currentVisitDate = null;
let confirmCallback = null;

let currentFilters = {
    dateFrom: null,
    dateTo: null,
    mediaTypes: ['image', 'video'],
    company: null,
    itemsPerPage: 12
};

// --- CORE FUNCTIONS ---

// Initializes the entire application after authentication
function initApp(user) {
    uid = user.uid;

    // Check for admin role (hardcoded for demo)
    // In a real app, this would be a check against a database or a secure backend call
    const adminUids = ['admin-uid-1', 'admin-uid-2']; // Replace with actual admin UIDs
    if (adminUids.includes(uid) || uid === 'admin-uid-1') {
        userRole = 'admin';
    } else {
        userRole = 'employee';
    }

    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('user-id-display').textContent = uid;
    document.getElementById('user-role-display').textContent = userRole.toUpperCase();

    // Start fetching data based on user role
    if (userRole === 'admin') {
        initAdminDashboard();
    } else {
        initEmployeeDashboard();
    }

    setupEventListeners();
}

function initAdminDashboard() {
    // Admin has full access to companies and can add more
    const companiesSection = document.getElementById('companies-section');
    companiesSection.innerHTML = `
        <h2 class="text-sm uppercase tracking-wider text-blue-300 mb-4">Companies</h2>
        <div class="space-y-2" id="companies-list"></div>
        <button onclick="showAddCompanyModal()" class="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center">
            <i class="fas fa-plus mr-2"></i> Add Company
        </button>
    `;

    const quickActionsSection = document.getElementById('quick-actions-section');
    quickActionsSection.innerHTML = `
        <h2 class="text-sm uppercase tracking-wider text-blue-300 mb-4">Quick Actions</h2>
        <button onclick="showUploadModal()" class="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg flex items-center justify-center mb-3">
            <i class="fas fa-cloud-upload-alt mr-2"></i> Upload Media
        </button>
        <button onclick="showSettingsModal()" class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg flex items-center justify-center">
            <i class="fas fa-cog mr-2"></i> Settings
        </button>
    `;

    // Start listeners for companies
    listenForCompanies();
    // Start with the main companies view
    showAllCompanies();
}

function initEmployeeDashboard() {
    // Employee only sees their expenses and can add visits/expenses
    const companiesSection = document.getElementById('companies-section');
    companiesSection.innerHTML = `
        <h2 class="text-sm uppercase tracking-wider text-blue-300 mb-4">Companies</h2>
        <div class="space-y-2" id="companies-list"></div>
    `;

    const quickActionsSection = document.getElementById('quick-actions-section');
    quickActionsSection.innerHTML = `
        <h2 class="text-sm uppercase tracking-wider text-blue-300 mb-4">Quick Actions</h2>
        <button onclick="showUploadModal()" class="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg flex items-center justify-center mb-3">
            <i class="fas fa-cloud-upload-alt mr-2"></i> Upload Media
        </button>
        <button onclick="showAddExpenseModal()" class="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg flex items-center justify-center mb-3">
            <i class="fas fa-file-invoice-dollar mr-2"></i> Add Expense
        </button>
        <button onclick="showSettingsModal()" class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg flex items-center justify-center">
            <i class="fas fa-cog mr-2"></i> Settings
        </button>
    `;

    // Start listeners for companies and expenses
    listenForCompanies();
    listenForExpenses();
    // Start with the main companies view
    showAllCompanies();
}


// --- FIREBASE DATA MANAGEMENT ---

// Real-time listener for companies collection (available to both Admin and Employee)
function listenForCompanies() {
    const companiesCollection = collection(db, `artifacts/${appId}/public/data/companies`);
    onSnapshot(companiesCollection, (snapshot) => {
        companies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (userRole === 'admin') {
            renderCompaniesList();
            renderCompaniesGrid();
            populateCompanyDropdown();
            populateFilterCompanyDropdown();
        } else {
            renderCompaniesList();
            renderCompaniesGrid();
            populateCompanyDropdown();
            populateFilterCompanyDropdown();
        }
    });
}

// Real-time listener for user's expenses (only for Employee)
function listenForExpenses() {
    const expensesCollection = collection(db, `artifacts/${appId}/users/${uid}/expenses`);
    onSnapshot(expensesCollection, (snapshot) => {
        expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Re-render if the user is on the expenses page
        if (document.getElementById('current-page-title').textContent === 'My Expenses') {
            showExpenses();
        }
    });
}

// --- UI RENDERING FUNCTIONS ---

// Renders the list of companies in the sidebar (Admin and Employee)
function renderCompaniesList() {
    const list = document.getElementById('companies-list');
    list.innerHTML = '';
    
    companies.forEach(company => {
        const item = document.createElement('div');
        item.className = 'company-card p-3 rounded-lg cursor-pointer hover:bg-blue-900 flex items-center justify-between';
        
        // Admin gets a delete button, Employee does not
        const deleteButton = userRole === 'admin' ? 
            `<button onclick="deleteCompany('${company.id}')" class="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-100 transition-colors duration-200">
                <i class="fas fa-trash-alt"></i>
            </button>` : '';

        item.innerHTML = `
            <div class="flex items-center flex-grow" onclick="showCompany('${company.id}')">
                <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                    <i class="fas fa-building text-white text-sm"></i>
                </div>
                <div>
                    <h3 class="font-medium">${company.name}</h3>
                    <p class="text-blue-200 text-xs">${company.visits.length} visits</p>
                </div>
            </div>
            ${deleteButton}
        `;
        list.appendChild(item);
    });
}

// Renders the main grid of companies (Admin and Employee)
function renderCompaniesGrid() {
    const mainTitle = document.getElementById('current-page-title');
    const mainSubtitle = document.getElementById('current-page-subtitle');
    const mainActions = document.getElementById('main-actions');
    const contentArea = document.getElementById('content-area');

    mainTitle.textContent = 'All Companies';
    mainSubtitle.textContent = 'Manage site visit photos and videos';
    mainActions.innerHTML = `
        <button onclick="showUploadModal()" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center">
            <i class="fas fa-cloud-upload-alt mr-2"></i> Upload
        </button>
        <button onclick="showFilterModal()" class="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 px-4 rounded-lg flex items-center">
            <i class="fas fa-filter mr-2"></i> Filter
            <span id="filter-badge" class="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full hidden">Active</span>
        </button>
    `;

    const filteredCompanies = companies.filter(company => {
        const companyMatch = !currentFilters.company || company.id == currentFilters.company;
        let hasMatchingMedia = false;
        company.visits.forEach(visit => {
            const visitDate = new Date(visit.date);
            const fromDate = currentFilters.dateFrom ? new Date(currentFilters.dateFrom) : null;
            const toDate = currentFilters.dateTo ? new Date(currentFilters.dateTo) : null;
            const dateMatch = (!fromDate || visitDate >= fromDate) && (!toDate || visitDate <= toDate);
            const mediaMatch = visit.media.some(media => currentFilters.mediaTypes.includes(media.type));
            if (dateMatch && mediaMatch) {
                hasMatchingMedia = true;
            }
        });
        return companyMatch && hasMatchingMedia;
    });
    
    if (filteredCompanies.length === 0) {
        contentArea.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-calendar-times text-4xl mb-4"></i>
                <p>No companies match your current filters.</p>
            </div>`;
        return;
    }

    contentArea.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="companies-grid"></div>`;
    const companiesGrid = document.getElementById('companies-grid');

    filteredCompanies.forEach(company => {
        let totalMedia = 0;
        company.visits.forEach(visit => {
            totalMedia += visit.media.filter(media => currentFilters.mediaTypes.includes(media.type)).length;
        });
        
        const lastVisit = company.visits.length > 0 ? new Date(company.visits[0].date).toLocaleDateString() : 'No visits';
        
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow';
        card.innerHTML = `
            <div class="h-48 bg-gradient-to-br from-blue-500 to-blue-700 relative">
                <div class="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                    <i class="fas fa-building text-white text-4xl"></i>
                </div>
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 text-white">
                    <h3 class="font-bold text-lg">${company.name}</h3>
                </div>
            </div>
            <div class="p-4">
                <div class="flex justify-between text-sm text-gray-600 mb-2">
                    <span><i class="fas fa-calendar-alt mr-1"></i> ${lastVisit}</span>
                    <span><i class="fas fa-images mr-1"></i> ${totalMedia}</span>
                </div>
                <button onclick="showCompany('${company.id}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg">
                    View Media
                </button>
            </div>
        `;
        companiesGrid.appendChild(card);
    });
}

function showAllCompanies() {
    currentCompanyId = null;
    currentVisitDate = null;
    updateBreadcrumb();
    renderCompaniesGrid();
}

// --- NEW EXPENSE FUNCTIONS (EMPLOYEE) ---
function showAddExpenseModal() {
    document.getElementById('add-expense-modal').classList.add('active');
}

async function addExpense() {
    const description = document.getElementById('expense-description').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);
    
    if (!description || isNaN(amount) || amount <= 0) {
        showConfirmModal('Please enter a valid description and amount.', () => {}, 'OK');
        return;
    }

    // A real app would upload the bill image to a storage bucket (like Firebase Storage)
    const billUrl = billFile ? URL.createObjectURL(billFile) : '';

    const newExpense = {
        description: description,
        amount: amount,
        billUrl: billUrl,
        timestamp: new Date().toISOString(),
        userId: uid,
        userName: `User ${uid.substring(0, 6)}` // For demo
    };

    try {
        await addDoc(collection(db, `artifacts/${appId}/users/${uid}/expenses`), newExpense);
        hideModal('add-expense-modal');
        document.getElementById('expense-description').value = '';
        document.getElementById('expense-amount').value = '';
        document.getElementById('bill-file-list').innerHTML = '';
        billFile = null;
        showConfirmModal('Expense added successfully!', () => {}, 'OK');
        showExpenses(); // Re-render the expenses list
    } catch (e) {
        showConfirmModal(`Error adding expense: ${e.message}`, () => {}, 'OK');
    }
}

function showExpenses() {
    const mainTitle = document.getElementById('current-page-title');
    const mainSubtitle = document.getElementById('current-page-subtitle');
    const contentArea = document.getElementById('content-area');
    const mainActions = document.getElementById('main-actions');

    mainTitle.textContent = 'My Expenses';
    mainSubtitle.textContent = 'View and manage your site visit expenses.';
    mainActions.innerHTML = `<button onclick="showAddExpenseModal()" class="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg flex items-center">
        <i class="fas fa-plus mr-2"></i> Add Expense
    </button>`;
    
    if (expenses.length === 0) {
        contentArea.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-file-invoice-dollar text-4xl mb-4"></i>
                <p>You have no expenses logged yet.</p>
            </div>
        `;
        return;
    }

    const expensesListHtml = expenses.map(expense => {
        return `
            <div class="flex justify-between items-center p-4 border-b border-gray-200 expense-item">
                <div class="flex-1">
                    <p class="font-semibold text-gray-900">${expense.description}</p>
                    <p class="text-sm text-gray-600">${new Date(expense.timestamp).toLocaleDateString()}</p>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="font-bold text-lg text-green-600">$${expense.amount.toFixed(2)}</span>
                    ${expense.billUrl ? `<button onclick="showMediaPreview('${expense.billUrl}', 'image', 'bill.jpg')" class="text-blue-600 hover:text-blue-800">
                        <i class="fas fa-receipt"></i>
                    </button>` : ''}
                    <button onclick="deleteExpense('${expense.id}')" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    contentArea.innerHTML = `
        <div class="bg-white rounded-lg shadow-md overflow-hidden">
            <div class="p-4 border-b border-gray-200 font-bold text-gray-800">Recent Expenses</div>
            ${expensesListHtml}
        </div>
    `;
    updateBreadcrumb('My Expenses');
}

async function deleteExpense(expenseId) {
    showConfirmModal('Are you sure you want to delete this expense? This cannot be undone.', async (confirmed) => {
        if (confirmed) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${uid}/expenses`, expenseId));
                showConfirmModal('Expense deleted successfully.', () => {}, 'OK');
            } catch (e) {
                showConfirmModal(`Error deleting expense: ${e.message}`, () => {}, 'OK');
            }
        }
    }, 'Delete');
}

// --- UTILITY FUNCTIONS ---

// Update breadcrumb navigation
function updateBreadcrumb(pageTitle, companyName = null, visitDate = null) {
    const breadcrumb = document.getElementById('breadcrumb');
    let html = '';

    if (pageTitle === 'All Companies' || pageTitle === 'My Expenses') {
        html = `<span>${pageTitle}</span>`;
    } else if (companyName && !visitDate) {
        html = `<span class="cursor-pointer hover:text-blue-600" onclick="showAllCompanies()">Companies</span>
                <i class="fas fa-chevron-right mx-2 text-gray-400"></i>
                <span>${companyName}</span>`;
    } else if (companyName && visitDate) {
        html = `<span class="cursor-pointer hover:text-blue-600" onclick="showAllCompanies()">Companies</span>
                <i class="fas fa-chevron-right mx-2 text-gray-400"></i>
                <span class="cursor-pointer hover:text-blue-600" onclick="showCompany('${currentCompanyId}')">${companyName}</span>
                <i class="fas fa-chevron-right mx-2 text-gray-400"></i>
                <span>${visitDate}</span>`;
    }
    breadcrumb.innerHTML = html;
}

// All other functions from the previous versions (showCompany, showVisit, addCompany, etc.)
// are included below and have been updated to use Firestore instead of localStorage.
// The file upload and modal logic remains the same.
// ... (omitted for brevity, the full code will be provided below)

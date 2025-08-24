// Data and state variables
let companies = JSON.parse(localStorage.getItem('sitevisit_companies')) || [
    {
        id: 1,
        name: "TechBuild Construction",
        email: "contact@techbuild.com",
        visits: [
            {
                date: "2024-01-15",
                media: [
                    { type: "image", url: "https://placehold.co/800x600/2563eb/ffffff?text=TechBuild+Jan+15", name: "site_overview.jpg" },
                    { type: "image", url: "https://placehold.co/800x600/1e40af/ffffff?text=TechBuild+Jan+15", name: "foundation_work.jpg" },
                    { type: "video", url: "https://www.w3schools.com/html/mov_bbb.mp4", name: "progress_update.mp4" }
                ]
            },
            {
                date: "2024-01-08",
                media: [
                    { type: "image", url: "https://placehold.co/800x600/15803d/ffffff?text=TechBuild+Jan+08", name: "initial_setup.jpg" },
                    { type: "image", url: "https://placehold.co/800x600/047857/ffffff?text=TechBuild+Jan+08", name: "equipment_arrival.jpg" }
                ]
            }
        ]
    },
    {
        id: 2,
        name: "UrbanDevelop Ltd",
        email: "info@urbandevelop.com",
        visits: [
            {
                date: "2024-01-12",
                media: [
                    { type: "image", url: "https://placehold.co/800x600/7c3aed/ffffff?text=UrbanDevelop+Jan+12", name: "site_prep.jpg" },
                    { type: "video", url: "https://www.w3schools.com/html/mov_bbb.mp4", name: "walkthrough.mp4" }
                ]
            }
        ]
    }
];

let selectedFiles = [];
let currentCompanyId = null;
let currentVisitDate = null;
let currentFilters = JSON.parse(localStorage.getItem('sitevisit_filters')) || {
    dateFrom: null,
    dateTo: null,
    mediaTypes: ['image', 'video'],
    company: null,
    itemsPerPage: 12
};
let settings = JSON.parse(localStorage.getItem('sitevisit_settings')) || {
    autoDelete: 'never',
    notifyUploads: true,
    notifyStorage: true
};

let confirmCallback = null;

// Utility function to show a custom confirmation modal
function showConfirmModal(message, onConfirm, buttonText = "Confirm") {
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-button').textContent = buttonText;
    confirmCallback = onConfirm;
    document.getElementById('confirm-modal').classList.add('active');
}

function hideConfirmModal(confirmed) {
    document.getElementById('confirm-modal').classList.remove('active');
    if (confirmCallback) {
        confirmCallback(confirmed);
        confirmCallback = null;
    }
}

// Initialize the application
function initApp() {
    saveData();
    renderCompaniesList();
    renderCompaniesGrid();
    populateCompanyDropdown();
    populateFilterCompanyDropdown();
    loadSettings();
    applySavedFilters();
    setupEventListeners();
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('sitevisit_companies', JSON.stringify(companies));
    localStorage.setItem('sitevisit_settings', JSON.stringify(settings));
    localStorage.setItem('sitevisit_filters', JSON.stringify(currentFilters));
}

// Setup event listeners for file upload drag and drop
function setupEventListeners() {
    // Get the two new input elements
    const cameraInput = document.getElementById('camera-input');
    const mediaInput = document.getElementById('media-input');

    // Add change listeners to handle file selection from either source
    cameraInput.addEventListener('change', (e) => handleFileSelect(e.target.files, 'camera'));
    mediaInput.addEventListener('change', (e) => handleFileSelect(e.target.files, 'media'));
}

// Load settings from localStorage
function loadSettings() {
    document.getElementById('auto-delete-setting').value = settings.autoDelete;
    document.getElementById('notify-uploads').checked = settings.notifyUploads;
    document.getElementById('notify-storage').checked = settings.notifyStorage;
}

// Apply saved filters
function applySavedFilters() {
    updateFilterUI();
    if (currentCompanyId) {
        showCompany(currentCompanyId);
    } else if (currentVisitDate) {
        showVisit(currentCompanyId, currentVisitDate);
    } else {
        showAllCompanies();
    }
}

// Render companies list in sidebar
function renderCompaniesList() {
    const list = document.getElementById('companies-list');
    list.innerHTML = '';
    
    companies.forEach(company => {
        const item = document.createElement('div');
        item.className = 'company-card p-3 rounded-lg cursor-pointer hover:bg-blue-900 flex items-center justify-between';
        item.innerHTML = `
            <div class="flex items-center flex-grow" onclick="showCompany(${company.id})">
                <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                    <i class="fas fa-building text-white text-sm"></i>
                </div>
                <div>
                    <h3 class="font-medium">${company.name}</h3>
                    <p class="text-blue-200 text-xs">${company.visits.length} visits</p>
                </div>
            </div>
            <button onclick="deleteCompany(${company.id})" class="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-100 transition-colors duration-200">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        list.appendChild(item);
    });
}

// Render companies grid in main content with filters
function renderCompaniesGrid() {
    const grid = document.getElementById('content-area');
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
         grid.innerHTML = `
             <div class="text-center py-12 text-gray-500">
                 <i class="fas fa-calendar-times text-4xl mb-4"></i>
                 <p>No companies match your current filters.</p>
             </div>`;
         return;
    }

    grid.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="companies-grid"></div>`;
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
                <button onclick="showCompany(${company.id})" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg">
                    View Media
                </button>
            </div>
        `;
        companiesGrid.appendChild(card);
    });
}

// Show specific company details with filters
function showCompany(companyId) {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;
    
    currentCompanyId = companyId;
    currentVisitDate = null;
    document.getElementById('current-company').textContent = company.name;
    updateBreadcrumb(company.name);
    
    const contentArea = document.getElementById('content-area');
    
    // Filter visits by date range
    let filteredVisits = company.visits;
    if (currentFilters.dateFrom) {
        filteredVisits = filteredVisits.filter(visit => new Date(visit.date) >= new Date(currentFilters.dateFrom));
    }
    if (currentFilters.dateTo) {
        filteredVisits = filteredVisits.filter(visit => new Date(visit.date) <= new Date(currentFilters.dateTo));
    }
    
    const sortedVisits = filteredVisits.sort((a, b) => new Date(b.date) - new Date(a.date));

    contentArea.innerHTML = `
        <div class="mb-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">Site Visits</h2>
                <!-- New Download All button for the company page -->
                <button onclick="downloadAllCompanyMedia(${company.id})" class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center">
                    <i class="fas fa-download mr-2"></i> Download All
                </button>
            </div>
            ${sortedVisits.length === 0 ? `
                <div class="text-center py-12 text-gray-500">
                    <i class="fas fa-calendar-times text-4xl mb-4"></i>
                    <p>No visits match your current filters</p>
                </div>
            ` : `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="visits-container">
                    ${sortedVisits.map(visit => {
                        const filteredMedia = visit.media.filter(media => 
                            currentFilters.mediaTypes.includes(media.type)
                        );
                        if (filteredMedia.length === 0) return '';
                        return `
                            <div class="date-folder p-4 cursor-pointer" onclick="showVisit(${companyId}, '${visit.date}')">
                                <div class="flex items-center justify-between mb-2">
                                    <h3 class="font-semibold">${new Date(visit.date).toLocaleDateString()}</h3>
                                    <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">${filteredMedia.length} items</span>
                                </div>
                                <div class="text-sm text-gray-600">
                                    ${filteredMedia.filter(m => m.type === 'image').length} photos, 
                                    ${filteredMedia.filter(m => m.type === 'video').length} videos
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;
}

// Show specific visit media with filters
function showVisit(companyId, visitDate) {
    const company = companies.find(c => c.id === parseInt(companyId));
    const visit = company.visits.find(v => v.date === visitDate);
    if (!company || !visit) return;
    
    currentVisitDate = visitDate;
    updateBreadcrumb(company.name, new Date(visitDate).toLocaleDateString());
    
    // Filter media by type
    const filteredMedia = visit.media.filter(media => 
        currentFilters.mediaTypes.includes(media.type)
    );
    
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="mb-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">Media from ${new Date(visitDate).toLocaleDateString()}</h2>
                <button onclick="downloadAllMedia(${companyId}, '${visitDate}')" class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center">
                    <i class="fas fa-download mr-2"></i> Download All
                </button>
            </div>
            ${filteredMedia.length === 0 ? `
                <div class="text-center py-12 text-gray-500">
                    <i class="fas fa-images text-4xl mb-4"></i>
                    <p>No media items match your current filters</p>
                </div>
            ` : `
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="media-container">
                    ${filteredMedia.map((item, index) => `
                        <div class="media-item bg-white rounded-lg shadow-md overflow-hidden">
                            <div class="cursor-pointer" onclick="showMediaPreview('${item.url}', '${item.type}', '${item.name}')">
                                ${item.type === 'image' ? `
                                    <img src="${item.url}" alt="${item.name}" class="w-full h-48 object-cover">
                                ` : `
                                    <div class="w-full h-48 bg-gray-800 flex items-center justify-center relative">
                                        <i class="fas fa-play-circle text-white text-4xl"></i>
                                        <div class="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                            Video
                                        </div>
                                    </div>
                                `}
                            </div>
                            <div class="p-3">
                                <p class="text-sm font-medium truncate">${item.name}</p>
                                <div class="flex justify-between items-center mt-2">
                                    <span class="text-xs text-gray-500">${item.type}</span>
                                    <button onclick="downloadMedia('${item.url}', '${item.name}')" class="text-blue-600 hover:text-blue-800">
                                        <i class="fas fa-download"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

// Show all companies
function showAllCompanies() {
    currentCompanyId = null;
    currentVisitDate = null;
    document.getElementById('current-company').textContent = 'All Companies';
    updateBreadcrumb();
    renderCompaniesGrid();
}

// Update breadcrumb navigation
function updateBreadcrumb(companyName = null, visitDate = null) {
    const breadcrumb = document.getElementById('breadcrumb');
    let html = '<span class="cursor-pointer hover:text-blue-600" onclick="showAllCompanies()">Companies</span>';
    
    if (companyName) {
        html += ` <i class="fas fa-chevron-right mx-2 text-gray-400"></i> <span class="cursor-pointer hover:text-blue-600" onclick="showCompany(${currentCompanyId})">${companyName}</span>`;
    }
    
    if (visitDate) {
        html += ` <i class="fas fa-chevron-right mx-2 text-gray-400"></i> <span>${visitDate}</span>`;
    }
    
    breadcrumb.innerHTML = html;
}

// Modal functions
function showUploadModal() {
    populateCompanyDropdown();
    selectedFiles = [];
    // Clear the file list and disable the upload button
    document.getElementById('file-list').innerHTML = '';
    document.getElementById('upload-button').disabled = true;
    document.getElementById('upload-modal').classList.add('active');
}

function showAddCompanyModal() {
    document.getElementById('add-company-modal').classList.add('active');
}

function showFilterModal() {
    // Populate filter form with current values
    document.getElementById('filter-date-from').value = currentFilters.dateFrom || '';
    document.getElementById('filter-date-to').value = currentFilters.dateTo || '';
    document.getElementById('filter-type-photos').checked = currentFilters.mediaTypes.includes('image');
    document.getElementById('filter-type-videos').checked = currentFilters.mediaTypes.includes('video');
    document.getElementById('filter-company').value = currentFilters.company || '';
    document.getElementById('filter-items-per-page').value = currentFilters.itemsPerPage;
    populateFilterCompanyDropdown();
    
    document.getElementById('filter-modal').classList.add('active');
}

function showSettingsModal() {
    document.getElementById('settings-modal').classList.add('active');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Populate company dropdowns
function populateCompanyDropdown() {
    const dropdown = document.getElementById('upload-company');
    dropdown.innerHTML = '<option value="">Select a company</option>';
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.id;
        option.textContent = company.name;
        dropdown.appendChild(option);
    });
}

function populateFilterCompanyDropdown() {
    const dropdown = document.getElementById('filter-company');
    const currentSelected = dropdown.value;
    dropdown.innerHTML = '<option value="">All Companies</option>';
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.id;
        option.textContent = company.name;
        dropdown.appendChild(option);
    });
    dropdown.value = currentSelected;
}

// Clear the filter form
function clearFilterForm() {
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    document.getElementById('filter-type-photos').checked = true;
    document.getElementById('filter-type-videos').checked = true;
    document.getElementById('filter-company').value = '';
    document.getElementById('filter-items-per-page').value = 12;
}

// Apply filters
function applyFilters() {
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;
    const photosEnabled = document.getElementById('filter-type-photos').checked;
    const videosEnabled = document.getElementById('filter-type-videos').checked;
    const companyId = document.getElementById('filter-company').value;
    const itemsPerPage = document.getElementById('filter-items-per-page').value;
    
    currentFilters.dateFrom = dateFrom;
    currentFilters.dateTo = dateTo;
    currentFilters.mediaTypes = [];
    if (photosEnabled) currentFilters.mediaTypes.push('image');
    if (videosEnabled) currentFilters.mediaTypes.push('video');
    currentFilters.company = companyId ? parseInt(companyId) : null;
    currentFilters.itemsPerPage = itemsPerPage;

    saveData();
    hideModal('filter-modal');
    updateFilterUI();
    
    if (currentCompanyId) {
        showCompany(currentCompanyId);
    } else {
        showAllCompanies();
    }
}

// Update filter UI to show active filters
function updateFilterUI() {
    const filterTagsContainer = document.getElementById('filter-tags');
    filterTagsContainer.innerHTML = '';
    
    let isActive = false;
    
    if (currentFilters.dateFrom || currentFilters.dateTo) {
        isActive = true;
        const dateRangeTag = document.createElement('span');
        dateRangeTag.className = 'filter-tag';
        dateRangeTag.textContent = `Date: ${currentFilters.dateFrom || 'Any'} to ${currentFilters.dateTo || 'Any'}`;
        filterTagsContainer.appendChild(dateRangeTag);
    }
    
    if (currentFilters.mediaTypes.length < 2) {
        isActive = true;
        const mediaTypeTag = document.createElement('span');
        mediaTypeTag.className = 'filter-tag';
        mediaTypeTag.textContent = `Type: ${currentFilters.mediaTypes.join(', ')}`;
        filterTagsContainer.appendChild(mediaTypeTag);
    }
    
    if (currentFilters.company) {
        isActive = true;
        const company = companies.find(c => c.id === currentFilters.company);
        const companyTag = document.createElement('span');
        companyTag.className = 'filter-tag';
        companyTag.textContent = `Company: ${company.name}`;
        filterTagsContainer.appendChild(companyTag);
    }
    
    if (isActive) {
        document.getElementById('active-filters').classList.remove('hidden');
    } else {
        document.getElementById('active-filters').classList.add('hidden');
    }
}

// Clear all filters
function clearAllFilters() {
    currentFilters = {
        dateFrom: null,
        dateTo: null,
        mediaTypes: ['image', 'video'],
        company: null,
        itemsPerPage: 12
    };
    saveData();
    updateFilterUI();
    showAllCompanies();
}

// Add a new company
function addNewCompany() {
    const name = document.getElementById('company-name').value.trim();
    const email = document.getElementById('company-email').value.trim();
    
    if (!name || !email) {
        showConfirmModal('Please fill in both the company name and email.', () => {}, 'OK');
        return;
    }

    const newId = companies.length > 0 ? Math.max(...companies.map(c => c.id)) + 1 : 1;
    const newCompany = {
        id: newId,
        name: name,
        email: email,
        visits: []
    };

    companies.push(newCompany);
    saveData();
    hideModal('add-company-modal');
    renderCompaniesList();
    renderCompaniesGrid();
    
    document.getElementById('company-name').value = '';
    document.getElementById('company-email').value = '';
    showConfirmModal('New company added successfully!', () => {}, 'OK');
}

// Function to delete a specific company
function deleteCompany(companyId) {
    showConfirmModal('Are you sure you want to delete this company and all its media? This cannot be undone.', (confirmed) => {
        if (confirmed) {
            companies = companies.filter(company => company.id !== companyId);
            saveData();
            renderCompaniesList();
            renderCompaniesGrid();
            showConfirmModal('Company deleted successfully.', () => {}, 'OK');
        }
    }, 'Delete');
}

// Handle file selection from camera or media library
function handleFileSelect(files, sourceType) {
    // Check if the source is the camera and no files were selected (common when camera access is denied)
    if (sourceType === 'camera' && files.length === 0) {
        showConfirmModal("Camera access is often blocked on non-secure websites (non-HTTPS). Please try again on a secure server or use 'Select from Media' instead.", () => {}, 'OK');
        return;
    }

    selectedFiles = Array.from(files);
    const fileListContainer = document.getElementById('file-list');
    fileListContainer.innerHTML = ''; // Clear previous list
    
    if (selectedFiles.length > 0) {
        selectedFiles.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'flex items-center space-x-2 p-2 bg-gray-100 rounded-lg';
            fileItem.innerHTML = `
                <i class="fas fa-file-alt text-gray-500"></i>
                <span class="text-sm text-gray-800 truncate">${file.name}</span>
                <span class="text-xs text-gray-500">(${ (file.size / 1024 / 1024).toFixed(2) } MB)</span>
            `;
            fileListContainer.appendChild(fileItem);
        });
        document.getElementById('upload-button').disabled = false;
    } else {
        document.getElementById('upload-button').disabled = true;
    }
}

// Start the upload process (simulated)
async function startUpload() {
    const companyId = document.getElementById('upload-company').value;
    const visitDate = document.getElementById('visit-date').value;
    
    if (!companyId || !visitDate || selectedFiles.length === 0) {
        showConfirmModal('Please select a company, date, and at least one file.', () => {}, 'OK');
        return;
    }
    
    const progressBar = document.querySelector('#upload-progress .progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    document.getElementById('upload-progress').classList.remove('hidden');

    const company = companies.find(c => c.id === parseInt(companyId));
    let visit = company.visits.find(v => v.date === visitDate);
    if (!visit) {
        visit = { date: visitDate, media: [] };
        company.visits.push(visit);
    }

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileType = file.type.startsWith('image/') ? 'image' : 'video';
        
        // Simulate file upload with a small delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Create a temporary URL for the uploaded file so it can be viewed locally
        const newMedia = {
            type: fileType,
            url: URL.createObjectURL(file),
            name: file.name
        };
        visit.media.push(newMedia);
        
        const progress = ((i + 1) / selectedFiles.length) * 100;
        progressBar.style.width = `${progress}%`;
        progressPercentage.textContent = `${Math.round(progress)}%`;
    }

    saveData();
    hideModal('upload-modal');
    
    // Clear inputs and selected files after upload
    document.getElementById('upload-company').value = '';
    document.getElementById('visit-date').value = '';
    document.getElementById('camera-input').value = null;
    document.getElementById('media-input').value = null;
    selectedFiles = [];
    document.getElementById('upload-progress').classList.add('hidden');
    
    showConfirmModal(`Successfully uploaded ${selectedFiles.length} files.`, () => {}, 'OK');
    
    // Re-render the current view to show the new media
    if (currentCompanyId) {
        showCompany(currentCompanyId);
    } else {
        showAllCompanies();
    }
}

// Save settings
function saveSettings() {
    settings.autoDelete = document.getElementById('auto-delete-setting').value;
    settings.notifyUploads = document.getElementById('notify-uploads').checked;
    settings.notifyStorage = document.getElementById('notify-storage').checked;
    saveData();
    hideModal('settings-modal');
}

// Export all data as JSON
function exportAllData() {
    const dataStr = JSON.stringify(companies, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitevisit_data.json';
    a.click();
    URL.revokeObjectURL(url);
    showConfirmModal('Data exported successfully!', () => {}, 'OK');
}

// New function to download all media for a specific company
function downloadAllCompanyMedia(companyId) {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;
    
    // Check if there's any media to download based on current filters
    let allMedia = [];
    company.visits.forEach(visit => {
        const filteredMedia = visit.media.filter(media => 
            currentFilters.mediaTypes.includes(media.type)
        );
        allMedia = allMedia.concat(filteredMedia);
    });
    
    if (allMedia.length === 0) {
        showConfirmModal('No media found to download with the current filters.', () => {}, 'OK');
        return;
    }
    
    showConfirmModal(`Preparing to download ${allMedia.length} files. This may take a moment.`, () => {
        allMedia.forEach(item => {
            downloadMedia(item.url, item.name);
        });
    }, 'Continue');
}

// Clear all data from local storage
function clearAllData() {
    showConfirmModal('Are you sure you want to clear all data? This cannot be undone.', (confirmed) => {
        if (confirmed) {
            companies = [];
            saveData();
            initApp();
            showConfirmModal('All data has been cleared.', () => {}, 'OK');
        }
    }, 'Clear All');
}

// Download all media from a specific visit
function downloadAllMedia(companyId, visitDate) {
    const company = companies.find(c => c.id === companyId);
    const visit = company.visits.find(v => v.date === visitDate);
    
    if (visit) {
        visit.media.forEach(item => {
            downloadMedia(item.url, item.name);
        });
    }
}

// Download a single media item
function downloadMedia(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Function to show the media preview modal
function showMediaPreview(url, type, name) {
    const mediaContent = document.getElementById('media-content');
    mediaContent.innerHTML = ''; // Clear previous content

    if (type === 'image') {
        mediaContent.innerHTML = `<img src="${url}" alt="${name}" class="max-h-[80vh] w-auto rounded-lg">`;
    } else if (type === 'video') {
        mediaContent.innerHTML = `<video src="${url}" controls class="max-h-[80vh] w-auto rounded-lg"></video>`;
    }

    document.getElementById('media-preview-modal').classList.add('active');
}

// Initial call to start the app
window.onload = initApp;

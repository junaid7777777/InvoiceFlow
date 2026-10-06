// State Arrays Managing Two-Tier System Collections
let workspaceState = { 
    records: [],
    currentInvoiceItems: [],
    isEditing: false,
    editTargetId: null
};

const formNode = document.getElementById('invoiceForm');
const formTitleEl = document.getElementById('formTitle');
const submitBtnEl = document.getElementById('submitFormBtn');
const addItemBtn = document.getElementById('addItemBtn');
const stagingCard = document.getElementById('stagingCard');
const stagingTableBody = document.getElementById('stagingTableBody');
const containerBody = document.getElementById('invoiceTableBodyContainer');

const displayTotalInvoiced = document.getElementById('totalInvoicedDisplay');
const displayRevenueCollected = document.getElementById('revenueCollectedDisplay');
const displayOutstandingUdhaar = document.getElementById('outstandingUdhaarDisplay');

const displayItemCount = document.getElementById('estItemCount');
const displayBaseTotal = document.getElementById('estBase');
const displayGstTotal = document.getElementById('estTax');
const displayGrandTotal = document.getElementById('estimatedTotalDisplay');

// Form Input Hook Element References
const inCustomer = document.getElementById('customerNameInput');
const inPhone = document.getElementById('customerPhoneInput');
const inStatus = document.getElementById('paymentStatusInput');
const dueDateContainer = document.getElementById('dueDateContainer');
const inDueDate = document.getElementById('itemDueDateInput');

const inItem = document.getElementById('itemNameInput');
const inQty = document.getElementById('quantityInput');
const inPrice = document.getElementById('unitPriceInput');

const gstToggle = document.getElementById('gstToggleInput');
const gstDropdownContainer = document.getElementById('gstDropdownContainer');
const inGstSlab = document.getElementById('gstRateInput');
const customGstContainer = document.getElementById('customGstContainer');
const inCustomGst = document.getElementById('customGstInput');

// Advanced Filter Elements
const inSearch = document.getElementById('searchInputField');
const inFilter = document.getElementById('filterSelectField');
const inTimeFilter = document.getElementById('filterTimeField');
const customDateWrapper = document.getElementById('customDateWrapper');
const inFromDate = document.getElementById('customFromDate');
const inToDate = document.getElementById('customToDate');
const overdueContainer = document.getElementById('overdueContainer');

// Auto-Suggest Dropdown List box Elements
const nameSuggestions = document.getElementById('nameSuggestions');
const phoneSuggestions = document.getElementById('phoneSuggestions');

window.addEventListener('load', () => {
    const dataString = localStorage.getItem('invoiceflow_v2_storage_key');
    if (dataString) {
        try { workspaceState.records = JSON.parse(dataString); } catch(e) { workspaceState.records = []; }
    }
    
    formNode.addEventListener('submit', handleFinalInvoiceSubmit);
    addItemBtn.addEventListener('click', handleAddItemToCart);
    
    // Status Context Dropdown toggler changes
    inStatus.addEventListener('change', () => {
        if (inStatus.value === 'PENDING') {
            dueDateContainer.classList.remove('hidden');
            inPhone.setAttribute('required', 'true');
            document.getElementById('phoneLabelAddon').innerText = "(Mandatory for Khaata)";
            document.getElementById('phoneLabelAddon').style.color = "var(--accent-orange)";
        } else {
            dueDateContainer.classList.add('hidden');
            inPhone.removeAttribute('required');
            document.getElementById('phoneLabelAddon').innerText = "(Optional for Cash)";
            document.getElementById('phoneLabelAddon').style.color = "var(--text-muted)";
        }
    });

    gstToggle.addEventListener('change', () => {
        if (gstToggle.checked) {
            gstDropdownContainer.classList.remove('hidden');
            if (inGstSlab.value === 'CUSTOM') customGstContainer.classList.remove('hidden');
        } else {
            gstDropdownContainer.classList.add('hidden');
            customGstContainer.classList.add('hidden');
        }
    });

    inGstSlab.addEventListener('change', () => {
        if (inGstSlab.value === 'CUSTOM' && gstToggle.checked) {
            customGstContainer.classList.remove('hidden');
        } else {
            customGstContainer.classList.add('hidden');
        }
    });

    // Wire up smart identity resolvers input listeners to catch collisions live
    inCustomer.addEventListener('input', handleNameAutoSuggest);
    inPhone.addEventListener('input', handlePhoneAutoSuggest);

    // Hide input suggestions overlay when clicking out of parameters box area bounds
    document.addEventListener('click', (e) => {
        if (e.target !== inCustomer) nameSuggestions.classList.add('hidden');
        if (e.target !== inPhone) phoneSuggestions.classList.add('hidden');
    });

    inSearch.addEventListener('input', renderDashboard);
    inFilter.addEventListener('change', renderDashboard);
    inTimeFilter.addEventListener('change', () => {
        if (inTimeFilter.value === 'CUSTOM_RANGE') customDateWrapper.classList.remove('hidden');
        else customDateWrapper.classList.add('hidden');
        renderDashboard();
    });
    inFromDate.addEventListener('change', renderDashboard);
    inToDate.addEventListener('change', renderDashboard);

    renderDashboard();
    runBackgroundOverdueClockCheck();
});

// Smart Auto-Suggest Identity Resolver Engine
function handleNameAutoSuggest() {
    const query = inCustomer.value.toLowerCase().trim();
    if (!query) { nameSuggestions.classList.add('hidden'); return; }
    
    let matches = [];
    let trackedIds = new Set();
    
    workspaceState.records.forEach(r => {
        if (r.customer && r.customer.toLowerCase().includes(query) && r.phone) {
            const profileKey = `${r.customer.toLowerCase()}-${r.phone}`;
            if (!trackedIds.has(profileKey)) {
                trackedIds.add(profileKey);
                matches.push({ name: r.customer, phone: r.phone });
            }
        }
    });

    if (matches.length === 0) { nameSuggestions.classList.add('hidden'); return; }
    
    nameSuggestions.innerHTML = '';
    nameSuggestions.classList.remove('hidden');
    matches.forEach(m => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `<span>👤 <strong>${m.name}</strong></span> <small style="color:var(--accent-blue); font-weight:600;">📱 ${m.phone}</small>`;
        item.addEventListener('click', () => {
            inCustomer.value = m.name;
            inPhone.value = m.phone;
            nameSuggestions.classList.add('hidden');
        });
        nameSuggestions.appendChild(item);
    });
}

function handlePhoneAutoSuggest() {
    const query = inPhone.value.trim();
    if (!query) { phoneSuggestions.classList.add('hidden'); return; }
    
    let matches = [];
    let trackedPhones = new Set();
    
    workspaceState.records.forEach(r => {
        if (r.phone && r.phone.includes(query)) {
            if (!trackedPhones.has(r.phone)) {
                trackedPhones.add(r.phone);
                matches.push({ name: r.customer, phone: r.phone });
            }
        }
    });

    if (matches.length === 0) { phoneSuggestions.classList.add('hidden'); return; }
    
    phoneSuggestions.innerHTML = '';
    phoneSuggestions.classList.remove('hidden');
    matches.forEach(m => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `<span>📱 <strong>${m.phone}</strong></span> <small style="color:var(--text-muted);">👤 ${m.name}</small>`;
        item.addEventListener('click', () => {
            inCustomer.value = m.name;
            inPhone.value = m.phone;
            phoneSuggestions.classList.add('hidden');
        });
        phoneSuggestions.appendChild(item);
    });
}

function calculateStagingTotals() {
    let baseSum = 0; let taxSum = 0; let grandSum = 0;
    workspaceState.currentInvoiceItems.forEach(item => {
        baseSum += item.base;
        taxSum += item.tax;
        grandSum += item.total;
    });

    displayItemCount.innerText = workspaceState.currentInvoiceItems.length;
    displayBaseTotal.innerText = `₹${baseSum.toFixed(2)}`;
    displayGstTotal.innerText = `₹${taxSum.toFixed(2)}`;
    displayGrandTotal.innerText = `₹${grandSum.toFixed(2)}`;

    if (workspaceState.currentInvoiceItems.length > 0) {
        stagingCard.classList.remove('hidden');
    } else {
        stagingCard.classList.add('hidden');
        if (!workspaceState.isEditing) {
            inCustomer.removeAttribute('disabled');
            inPhone.removeAttribute('disabled');
            inStatus.removeAttribute('disabled');
        }
    }
}

function handleAddItemToCart() {
    const customerName = inCustomer.value.trim();
    const phoneNum = inPhone.value.trim();
    const itemName = inItem.value.trim();
    const qty = parseInt(inQty.value, 10);
    const price = parseFloat(inPrice.value);
    const itemStatus = inStatus.value;
    const dueDateValue = inDueDate.value;
    
    if (!customerName) { alert("❌ Customer Required: Enter customer name."); return; }
    if (itemStatus === 'PENDING' && !phoneNum) { alert("❌ Phone Required: Mobile numbers are strictly mandatory for running Khaata accounts!"); return; }
    if (itemStatus === 'PENDING' && !dueDateValue) { alert("❌ Deadline Required: Please pick a promise return date for this outstanding balance."); return; }
    if (!itemName || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) { alert("❌ Entry Error: Provide valid product metrics parameters."); return; }

    const isGstEnabled = gstToggle.checked;
    let gstRate = 0;
    if (isGstEnabled) {
        if (inGstSlab.value === 'CUSTOM') {
            gstRate = parseFloat(inCustomGst.value);
            if (isNaN(gstRate) || gstRate < 0 || gstRate > 100) { alert("❌ Custom Tax Error: Provide a valid rate (0-100)."); return; }
        } else {
            gstRate = parseFloat(inGstSlab.value);
        }
    }

    const base = qty * price;
    const tax = base * (gstRate / 100);
    const total = base + tax;

    workspaceState.currentInvoiceItems.push({
        id: Date.now() + Math.random(),
        name: itemName,
        qty: qty,
        price: price,
        gstEnabled: isGstEnabled,
        gstRate: gstRate,
        base: base,
        tax: tax,
        total: total,
        status: itemStatus,
        dueDate: itemStatus === 'PENDING' ? dueDateValue : ''
    });

    inCustomer.setAttribute('disabled', 'true');
    inPhone.setAttribute('disabled', 'true');
    inStatus.setAttribute('disabled', 'true');

    inItem.value = ''; inQty.value = '1'; inPrice.value = ''; inCustomGst.value = '';
    renderStagingTable();
}

function renderStagingTable() {
    stagingTableBody.innerHTML = '';
    workspaceState.currentInvoiceItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        const badgeClass = item.status === 'PAID' ? 'badge paid' : 'badge pending';
        tr.innerHTML = `
            <td>${item.name}</td>
            <td><span class="${badgeClass}">${item.status}</span></td>
            <td><strong>₹${item.total.toFixed(2)}</strong></td>
            <td><button type="button" class="btn-action btn-danger" onclick="removeItemFromStaging(${index})">Remove</button></td>
        `;
        stagingTableBody.appendChild(tr);
    });
    calculateStagingTotals();
}

window.removeItemFromStaging = function(index) {
    workspaceState.currentInvoiceItems.splice(index, 1);
    renderStagingTable();
}

function handleFinalInvoiceSubmit(e) {
    e.preventDefault();
    const customerName = inCustomer.value.trim();
    const phoneNum = inPhone.value.trim();
    const numericTimestamp = Date.now();

    if (workspaceState.currentInvoiceItems.length === 0) { alert("❌ Staging Empty: Click the blue '+ Add Item to Bill' button first before saving."); return; }

    if (workspaceState.isEditing) {
        const existingRecord = workspaceState.records.find(r => r.invoiceGroupId === workspaceState.editTargetId);
        const originalTime = existingRecord ? existingRecord.timestamp : numericTimestamp;

        workspaceState.records = workspaceState.records.filter(r => r.invoiceGroupId === workspaceState.editTargetId);
        
        workspaceState.currentInvoiceItems.forEach(item => {
            workspaceState.records.push({
                id: Date.now() + Math.random(),
                invoiceGroupId: workspaceState.editTargetId,
                timestamp: originalTime,
                customer: customerName,
                phone: phoneNum,
                item: item.name,
                qty: item.qty,
                price: item.price,
                gstEnabled: item.gstEnabled,
                gstRate: item.gstRate,
                base: item.base,
                tax: item.tax,
                total: item.total,
                status: item.status,
                dueDate: item.dueDate
            });
        });

        workspaceState.isEditing = false;
        workspaceState.editTargetId = null;
        formTitleEl.innerText = "Generate New Bill";
        submitBtnEl.innerText = "Finalize & Save Invoice";
    } else {
        const generatedGroupId = workspaceState.records.length > 0 ? Math.max(...workspaceState.records.map(r => r.invoiceGroupId || 1001)) + 1 : 1001;
        
        workspaceState.currentInvoiceItems.forEach(item => {
            workspaceState.records.push({
                id: Date.now() + Math.random(),
                invoiceGroupId: generatedGroupId,
                timestamp: numericTimestamp,
                customer: customerName,
                phone: phoneNum,
                item: item.name,
                qty: item.qty,
                price: item.price,
                gstEnabled: item.gstEnabled,
                gstRate: item.gstRate,
                base: item.base,
                tax: item.tax,
                total: item.total,
                status: item.status,
                dueDate: item.dueDate
            });
        });
    }

    localStorage.setItem('invoiceflow_v2_storage_key', JSON.stringify(workspaceState.records));
    formNode.reset();
    workspaceState.currentInvoiceItems = [];
    
    inCustomer.removeAttribute('disabled');
    inPhone.removeAttribute('disabled');
    inStatus.removeAttribute('disabled');
    dueDateContainer.classList.add('hidden');
    customGstContainer.classList.add('hidden');
    
    renderStagingTable();
    renderDashboard();
    runBackgroundOverdueClockCheck();
}

window.initiateRecordEdit = function(targetGroupId) {
    const groupRecords = workspaceState.records.filter(r => r.invoiceGroupId === targetGroupId);
    if (groupRecords.length === 0) return;

    inCustomer.value = groupRecords.customer;
    inPhone.value = groupRecords.phone || '';
    
    inCustomer.setAttribute('disabled', 'true');
    inPhone.setAttribute('disabled', 'true');
    inStatus.setAttribute('disabled', 'true');
    
    workspaceState.currentInvoiceItems = groupRecords.map(r => ({
        id: r.id,
        name: r.item,
        qty: r.qty,
        price: r.price,
        gstEnabled: r.gstEnabled,
        gstRate: r.gstRate,
        base: r.base,
        tax: r.tax,
        total: r.total,
        status: r.status,
        dueDate: r.dueDate || ''
    }));

    workspaceState.isEditing = true;
    workspaceState.editTargetId = targetGroupId;
    formTitleEl.innerText = `✍️ Editing Invoice Group INV-${targetGroupId}`;
    submitBtnEl.innerText = "Save Invoice Mutations";
    
    renderStagingTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.settleInvoiceRecordDirectly = function(recordId) {
    const matchIndex = workspaceState.records.findIndex(r => r.id === recordId);
    if (matchIndex !== -1) {
        workspaceState.records[matchIndex].status = 'PAID';
        workspaceState.records[matchIndex].dueDate = ''; 
        localStorage.setItem('invoiceflow_v2_storage_key', JSON.stringify(workspaceState.records));
        renderDashboard();
        runBackgroundOverdueClockCheck();
    }
}

function runBackgroundOverdueClockCheck() {
    overdueContainer.innerHTML = '';
    const todayStartMs = new Date().setHours(0,0,0,0);
    
    // Filter matching lines
    let overdueRecords = workspaceState.records.filter(r => r.status === 'PENDING' && r.dueDate && new Date(r.dueDate).getTime() < todayStartMs);

    if (overdueRecords.length === 0) {
        overdueContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">🎉 Zero running accounts are overdue.</p>';
        return;
    }

    overdueRecords.forEach(r => {
        const alertCard = document.createElement('div');
        alertCard.className = 'overdue-alert-card';
        
        const rawDate = new Date(r.dueDate);
        const formattedDueDate = rawDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

        // CRITICAL FIX: Pass ONLY the unique database ID of the record into the click handler to prevent punctuation parsing crashes!
        alertCard.innerHTML = `
            <div class="overdue-meta">
                <span>⚠️ OVERDUE DEADLINE</span>
                <span>₹${r.total.toFixed(2)}</span>
            </div>
            <div style="color:var(--text-main); font-weight:600;">${r.customer} (${r.phone})</div>
            <div style="color:var(--text-muted); font-size:0.8rem;">Item: ${r.item} | Missed on: <strong>${formattedDueDate}</strong></div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                <button type="button" class="btn-action btn-paid" onclick="settleInvoiceRecordDirectly(${r.id})" style="font-size:0.7rem; padding:2px 6px;">Clear Debt</button>
                <button type="button" class="btn-wa-copy" onclick="sendWhatsAppAlertDirectly(${r.id})">💬 Send Alert</button>
            </div>
        `;
        overdueContainer.appendChild(alertCard);
    });
}

// Fixed global window execution pipeline handler
window.settleInvoiceRecordDirectly = function(recordId) {
    const matchIndex = workspaceState.records.findIndex(r => r.id === recordId);
    if (matchIndex !== -1) {
        workspaceState.records[matchIndex].status = 'PAID';
        workspaceState.records[matchIndex].dueDate = ''; 
        localStorage.setItem('invoiceflow_v2_storage_key', JSON.stringify(workspaceState.records));
        renderDashboard();
        runBackgroundOverdueClockCheck();
    }
}

function runBackgroundOverdueClockCheck() {
    overdueContainer.innerHTML = '';
    const todayStartMs = new Date().setHours(0,0,0,0);
    
    let overdueRecords = workspaceState.records.filter(r => r.status === 'PENDING' && r.dueDate && new Date(r.dueDate).getTime() < todayStartMs);

    if (overdueRecords.length === 0) {
        overdueContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">🎉 Zero running accounts are overdue.</p>';
        return;
    }

    overdueRecords.forEach(r => {
        const alertCard = document.createElement('div');
        alertCard.className = 'overdue-alert-card';
        
        const rawDate = new Date(r.dueDate);
        const formattedDueDate = rawDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

        alertCard.innerHTML = `
            <div class="overdue-meta">
                <span>⚠️ OVERDUE DEADLINE</span>
                <span>₹${r.total.toFixed(2)}</span>
            </div>
            <div style="color:var(--text-main); font-weight:600;">${r.customer} (${r.phone})</div>
            <div style="color:var(--text-muted); font-size:0.8rem;">Item: ${r.item} | Missed on: <strong>${formattedDueDate}</strong></div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                <button type="button" class="btn-action btn-paid" onclick="settleInvoiceRecordDirectly(${r.id})" style="font-size:0.7rem; padding:2px 6px;">Clear Debt</button>
                <button type="button" class="btn-wa-copy" onclick="sendWhatsAppAlertDirectly(${r.id})">💬 Send Alert</button>
            </div>
        `;
        overdueContainer.appendChild(alertCard);
    });
}

// Global execution wrapper
window.sendWhatsAppAlertDirectly = function(targetRecordId) {
    const record = workspaceState.records.find(r => r.id === targetRecordId);
    if (!record) return;

    const rawDate = new Date(record.dueDate);
    const formattedDueDate = rawDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

    const messageBody = `Dear ${record.customer}, your running balance of ₹${record.total.toFixed(2)} for ${record.item} (Bill: G-INV-${record.invoiceGroupId}) was due on ${formattedDueDate}. Kindly clear your outstanding Khaata payment at our shop. Thank you!`;
    const fullLink = `https://whatsapp.com{record.phone}&text=${encodeURIComponent(messageBody)}`;
    
    window.open(fullLink, '_blank');
}

function renderDashboard() {
    let totalInvoicedSum = 0; let totalRevenueSum = 0; let totalUdhaarSum = 0;
    const now = Date.now();

    let parsedFilteredList = workspaceState.records.filter(r => {
        const nameStr = r.customer ? r.customer.toLowerCase() : '';
        const phoneStr = r.phone ? r.phone : '';
        const query = inSearch.value.toLowerCase().trim();
        const textMatch = nameStr.includes(query) || phoneStr.includes(query);
        
        let statusMatch = true;
        if (inFilter.value === 'PAID') statusMatch = (r.status && r.status.toUpperCase() === 'PAID');
        if (inFilter.value === 'PENDING') statusMatch = (r.status && r.status.toUpperCase() === 'PENDING');

        let timeMatch = true;
        const diffMs = now - (r.timestamp || now);
        
        switch (inTimeFilter.value) {
            case '24H': timeMatch = diffMs <= 24 * 60 * 60 * 1000; break;
            case '7D':  timeMatch = diffMs <= 7 * 24 * 60 * 60 * 1000; break;
            case '4W':  timeMatch = diffMs <= 4 * 7 * 24 * 60 * 60 * 1000; break;
            case '2M':  timeMatch = diffMs <= 2 * 30 * 24 * 60 * 60 * 1000; break;
            case '3M':  timeMatch = diffMs <= 3 * 30 * 24 * 60 * 60 * 1000; break;
            case '6M':  timeMatch = diffMs <= 6 * 30 * 24 * 60 * 60 * 1000; break;
            case '12M': timeMatch = diffMs <= 12 * 30 * 24 * 60 * 60 * 1000; break;
            case 'CUSTOM_RANGE':
                if (inFromDate.value && inToDate.value) {
                    const startMs = new Date(inFromDate.value).setHours(0,0,0,0);
                    const endMs = new Date(inToDate.value).setHours(23,59,59,999);
                    timeMatch = (r.timestamp >= startMs && r.timestamp <= endMs);
                }
                break;
        }
        return textMatch && statusMatch && timeMatch;
    });

    parsedFilteredList.forEach(r => {
        totalInvoicedSum += r.total || 0;
        if (r.status && r.status.toUpperCase() === 'PAID') totalRevenueSum += r.total || 0;
        else totalUdhaarSum += r.total || 0;
    });

    displayTotalInvoiced.innerText = `₹${totalInvoicedSum.toFixed(2)}`;
    displayRevenueCollected.innerText = `₹${totalRevenueSum.toFixed(2)}`;
    displayOutstandingUdhaar.innerText = `₹${totalUdhaarSum.toFixed(2)}`;

    containerBody.innerHTML = '';
    if (parsedFilteredList.length === 0) {
        containerBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">No transaction logs match active filters.</td></tr>`;
        return;
    }

    parsedFilteredList.forEach(r => {
        const tr = document.createElement('tr');
        const currentStatus = r.status ? r.status.toUpperCase() : 'PENDING';
        const badgeClass = currentStatus === 'PAID' ? 'badge paid' : 'badge pending';
        const statusLabelText = currentStatus === 'PAID' ? 'PAID (Clear)' : 'PENDING (Udhaar)';

        let actHTML = '';
        if (currentStatus === 'PENDING') {
            actHTML += `<button class="btn-action btn-paid" onclick="settleInvoiceRecordDirectly(${r.id})" style="margin-right:4px;">Settle</button>`;
        }
        actHTML += `<button class="btn-action btn-edit" onclick="initiateRecordEdit(${r.invoiceGroupId || 1001})" style="margin-right:4px;">Edit Group</button>`;
        actHTML += `<button class="btn-action btn-print" onclick="window.print()">Print</button>`;

        const dateObj = new Date(r.timestamp || Date.now());
        const dateString = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeString = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

        const subTitleIdentityText = r.phone ? `<small style="display:block; color:var(--accent-blue); margin-top:2px; font-weight:600;">📞 ${r.phone}</small>` : `<small style="display:block; color:var(--text-muted); margin-top:2px;">🛒 One-Time Cash</small>`;

        tr.innerHTML = `
            <td>
                <strong>G-INV-${r.invoiceGroupId || 1001}</strong>
                <small style="display:block; color:var(--text-muted); margin-top:2px; font-size:0.75rem;">${dateString}<br>${timeString}</small>
            </td>
            <td><strong>${r.customer || 'Unknown'}</strong>${subTitleIdentityText}</td>
            <td>
                <span style="font-weight:600; color:#1e1b4b;">${r.item} (x${r.qty})</span>
                <small style="display:block; color:var(--text-muted); font-size:0.75rem;">Tax: ₹${(r.tax || 0).toFixed(2)} (${r.gstRate || 0}%)</small>
            </td>
            <td><strong>₹${(r.total || 0).toFixed(2)}</strong></td>
            <td><span class="${badgeClass}">${statusLabelText}</span></td>
            <td><div class="actions-flex">${actHTML}</div></td>
        `;
        containerBody.appendChild(tr);
    });
}

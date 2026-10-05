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

const inCustomer = document.getElementById('customerNameInput');
const inItem = document.getElementById('itemNameInput');
const inQty = document.getElementById('quantityInput');
const inPrice = document.getElementById('unitPriceInput');

const gstToggle = document.getElementById('gstToggleInput');
const gstDropdownContainer = document.getElementById('gstDropdownContainer');
const inGstSlab = document.getElementById('gstRateInput');
const customGstContainer = document.getElementById('customGstContainer');
const inCustomGst = document.getElementById('customGstInput');

const inSearch = document.getElementById('searchInputField');
const inFilter = document.getElementById('filterSelectField');

window.addEventListener('load', () => {
    const dataString = localStorage.getItem('invoiceflow_v2_storage_key');
    if (dataString) {
        try { workspaceState.records = JSON.parse(dataString); } catch(e) { workspaceState.records = []; }
    }
    
    formNode.addEventListener('submit', handleFinalInvoiceSubmit);
    addItemBtn.addEventListener('click', handleAddItemToCart);
    
    // Toggle selector engine visibility rules
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

    inSearch.addEventListener('input', renderDashboard);
    inFilter.addEventListener('change', renderDashboard);

    renderDashboard();
});

// Calculate items staged into active storage boundaries
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

    if (workspaceState.currentInvoiceItems.length > 0) stagingCard.classList.remove('hidden');
    else stagingCard.classList.add('hidden');
}

// Stage a new product row into current invoice card variables
function handleAddItemToCart() {
    const itemName = inItem.value.trim();
    const qty = parseInt(inQty.value, 10);
    const price = parseFloat(inPrice.value);
    
    if (!itemName || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
        alert("❌ Item Entry Error: Provide valid product name, quantity, and unit price.");
        return;
    }

    const isGstEnabled = gstToggle.checked;
    let gstRate = 0;
    if (isGstEnabled) {
        if (inGstSlab.value === 'CUSTOM') {
            gstRate = parseFloat(inCustomGst.value);
            if (isNaN(gstRate) || gstRate < 0 || gstRate > 100) {
                alert("❌ Custom Tax Error: Please specify a valid GST percent entry (0-100).");
                return;
            }
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
        total: total
    });

    inItem.value = '';
    inQty.value = '1';
    inPrice.value = '';
    inCustomGst.value = '';
    renderStagingTable();
}

function renderStagingTable() {
    stagingTableBody.innerHTML = '';
    workspaceState.currentInvoiceItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.qty} x ₹${item.price.toFixed(2)}</td>
            <td>₹${item.tax.toFixed(2)} (${item.gstRate}%)</td>
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

// Finalize transaction array blocks and save into storage strings
function handleFinalInvoiceSubmit(e) {
    e.preventDefault();
    const customerName = inCustomer.value.trim();
    const statusValue = document.getElementById('paymentStatusInput').value;

    if (!customerName) {
        alert("❌ Field Missing: Please supply a customer name.");
        return;
    }
    if (workspaceState.currentInvoiceItems.length === 0) {
        alert("❌ Card Empty: Please click the blue '+ Add Item to Bill' button first before saving!");
        return;
    }

    let invoiceGrandSum = workspaceState.currentInvoiceItems.reduce((sum, i) => sum + i.total, 0);

    if (workspaceState.isEditing) {
        const matchIndex = workspaceState.records.findIndex(r => r.id === workspaceState.editTargetId);
        if (matchIndex !== -1) {
            workspaceState.records[matchIndex].customer = customerName;
            workspaceState.records[matchIndex].items = [...workspaceState.currentInvoiceItems];
            workspaceState.records[matchIndex].total = invoiceGrandSum;
            workspaceState.records[matchIndex].status = statusValue;
        }
        workspaceState.isEditing = false;
        workspaceState.editTargetId = null;
        formTitleEl.innerText = "Generate New Bill";
        submitBtnEl.innerText = "Finalize & Save Invoice";
    } else {
        const nextId = workspaceState.records.length > 0 ? Math.max(...workspaceState.records.map(r => r.id)) + 1 : 1001;
        workspaceState.records.push({
            id: nextId,
            customer: customerName,
            items: [...workspaceState.currentInvoiceItems],
            total: invoiceGrandSum,
            status: statusValue
        });
    }

    localStorage.setItem('invoiceflow_v2_storage_key', JSON.stringify(workspaceState.records));
    formNode.reset();
    workspaceState.currentInvoiceItems = [];
    customGstContainer.classList.add('hidden');
    renderStagingTable();
    renderDashboard();
}

window.initiateRecordEdit = function(targetId) {
    const record = workspaceState.records.find(r => r.id === targetId);
    if (!record) return;

    inCustomer.value = record.customer;
    workspaceState.currentInvoiceItems = record.items ? [...record.items] : [];
    document.getElementById('paymentStatusInput').value = record.status;

    workspaceState.isEditing = true;
    workspaceState.editTargetId = targetId;
    formTitleEl.innerText = `✍️ Editing Invoice INV-${targetId}`;
    submitBtnEl.innerText = "Save Invoice Mutations";
    
    renderStagingTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.settleInvoiceRecordDirectly = function(targetId) {
    const matchIndex = workspaceState.records.findIndex(r => r.id === targetId);
    if (matchIndex !== -1) {
        workspaceState.records[matchIndex].status = 'PAID';
        localStorage.setItem('invoiceflow_v2_storage_key', JSON.stringify(workspaceState.records));
        renderDashboard();
    }
}

function renderDashboard() {
    let totalInvoicedSum = 0; let totalRevenueSum = 0; let totalUdhaarSum = 0;
    
    workspaceState.records.forEach(r => {
        totalInvoicedSum += r.total || 0;
        if (r.status && r.status.toUpperCase() === 'PAID') totalRevenueSum += r.total || 0;
        else totalUdhaarSum += r.total || 0;
    });

    displayTotalInvoiced.innerText = `₹${totalInvoicedSum.toFixed(2)}`;
    displayRevenueCollected.innerText = `₹${totalRevenueSum.toFixed(2)}`;
    displayOutstandingUdhaar.innerText = `₹${totalUdhaarSum.toFixed(2)}`;

    const queryText = inSearch && inSearch.value ? inSearch.value.toLowerCase().trim() : '';
    const chosenFilter = inFilter ? inFilter.value : 'All Bills';

    let filteredList = workspaceState.records.filter(r => {
        const customerNameStr = r.customer ? r.customer.toLowerCase() : '';
        const textMatch = customerNameStr.includes(queryText);
        
        let filterMatch = true;
        if (chosenFilter === 'PAID') filterMatch = (r.status && r.status.toUpperCase() === 'PAID');
        if (chosenFilter === 'PENDING') filterMatch = (r.status && r.status.toUpperCase() === 'PENDING');
        return textMatch && filterMatch;
    });

    containerBody.innerHTML = '';
    if (filteredList.length === 0) {
        containerBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">No transaction logs found.</td></tr>`;
        return;
    }

    filteredList.forEach(r => {
        const tr = document.createElement('tr');
        const currentStatus = r.status ? r.status.toUpperCase() : 'PENDING';
        const badgeClass = currentStatus === 'PAID' ? 'badge paid' : 'badge pending';
        const statusLabelText = currentStatus === 'PAID' ? 'PAID (Clear)' : 'PENDING (Udhaar)';

        let actHTML = '';
        if (currentStatus === 'PENDING') {
            actHTML += `<button class="btn-action btn-paid" onclick="settleInvoiceRecordDirectly(${r.id})" style="margin-right:4px;">Settle</button>`;
        }
        actHTML += `<button class="btn-action btn-edit" onclick="initiateRecordEdit(${r.id})" style="margin-right:4px;">Edit</button>`;
        actHTML += `<button class="btn-action btn-print" onclick="window.print()">Print</button>`;

        // Guard mapping summary against missing arrays cleanly
        const listSummaryString = r.items && Array.isArray(r.items) 
            ? r.items.map(i => `${i.name} (x${i.qty})`).join(', ') 
            : 'Single Product Record';

        tr.innerHTML = `
            <td><strong>INV-${r.id}</strong></td>
            <td>${r.customer || 'Unknown'}</td>
            <td><span style="font-size:0.8rem; display:block; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${listSummaryString}">${listSummaryString}</span></td>
            <td><strong>₹${(r.total || 0).toFixed(2)}</strong></td>
            <td><span class="${badgeClass}">${statusLabelText}</span></td>
            <td><div class="actions-flex">${actHTML}</div></td>
        `;
        containerBody.appendChild(tr);
    });
}

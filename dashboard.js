import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, onSnapshot, runTransaction,
  updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const status = document.getElementById("status");
const orderCount = document.getElementById("orderCount");
const manualCount = document.getElementById("manualCount");
const lastOrder = document.getElementById("lastOrder");
const manualOrderForm = document.getElementById("manualOrderForm");
const formMessage = document.getElementById("formMessage");
const ordersList = document.getElementById("ordersList");
const orderHistoryList = document.getElementById("orderHistoryList");
const logoutButton = document.getElementById("logout");

let currentUser = null;
let allOrders = [];

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "admin.html";
    return;
  }
  currentUser = user;
  status.textContent = `Signed in as ${user.email}`;
  startOrdersListener();
});

function startOrdersListener() {
  onSnapshot(collection(db, "orders"), (snapshot) => {
    allOrders = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    allOrders.sort((a, b) => {
      const at = a.createdAt?.toMillis?.() || 0;
      const bt = b.createdAt?.toMillis?.() || 0;
      return bt - at;
    });
    updateStats();
    renderOrders();
    renderOrderHistory();
  }, (error) => {
    console.error(error);
    ordersList.innerHTML = `<p class="muted">Unable to load orders. Check Firestore rules.</p>`;
  });
}

function updateStats() {
  orderCount.textContent = allOrders.length;
  manualCount.textContent = allOrders.filter(o => o.source === "manual").length;
  lastOrder.textContent = allOrders.length ? (allOrders[0].orderId || allOrders[0].id) : "—";
}

manualOrderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    formMessage.textContent = "Please sign in again.";
    return;
  }

  const saveButton = document.getElementById("saveOrder");
  saveButton.disabled = true;
  saveButton.textContent = "Creating Order…";
  formMessage.textContent = "";

  const customer = document.getElementById("customer").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const product = document.getElementById("product").value.trim();
  const size = document.getElementById("size").value;
  const colour = document.getElementById("colour").value;
  const quantity = Number(document.getElementById("quantity").value);
  const amount = Number(document.getElementById("amount").value);
  const payment = document.getElementById("payment").value;
  const address = document.getElementById("address").value.trim();

  try {
    const counterRef = doc(db, "settings", "orderCounter");
    let newOrderId = "";

    await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const lastNumber = counterSnap.exists()
        ? Number(counterSnap.data().lastNumber || 51)
        : 51;
      const nextNumber = lastNumber + 1;
      newOrderId = `BKR${String(nextNumber).padStart(5, "0")}`;

      transaction.set(counterRef, {
        lastNumber: nextNumber,
        updatedAt: serverTimestamp()
      }, { merge: true });

      transaction.set(doc(db, "orders", newOrderId), {
        orderId: newOrderId,
        source: "manual",
        customer, phone, product, size, colour, quantity, amount, payment, address,
        status: "Confirmed",
        trackingId: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser.email
      });
    });

    formMessage.textContent = `Order ${newOrderId} created successfully.`;
    manualOrderForm.reset();
    document.getElementById("product").value = "Barakahh Printed T-Shirt";
    document.getElementById("quantity").value = "1";
    document.getElementById("amount").value = "499";
  } catch (error) {
    console.error(error);
    formMessage.textContent = "Order could not be created. Check Firestore rules.";
  }

  saveButton.disabled = false;
  saveButton.textContent = "Create Manual Order";
});

function renderOrders() {
  const activeOrders = allOrders.filter(
    order => order.status !== "Delivered" && order.status !== "Cancelled"
  );

  if (!activeOrders.length) {
    ordersList.innerHTML = `<p class="muted">No active orders.</p>`;
    return;
  }

  ordersList.innerHTML = "";

  activeOrders.slice(0, 20).forEach((order) => {
    const card = document.createElement("div");
    card.className = "order-card";

    const title = document.createElement("h3");
    title.textContent = order.orderId || order.id;

    const customer = document.createElement("p");
    customer.textContent = `${order.customer || "Customer"} • ${order.phone || ""}`;

    const product = document.createElement("p");
    product.textContent =
      `${order.product || ""} • Size: ${order.size || "-"} • ${order.colour || "-"}`;

    const amount = document.createElement("p");
    amount.textContent = `₹${order.amount || 0} • Qty: ${order.quantity || 1}`;

    const statusLabel = document.createElement("label");
    statusLabel.textContent = "Status";

    const statusSelect = document.createElement("select");
    ["Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"].forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      option.selected = order.status === value;
      statusSelect.appendChild(option);
    });

    const trackingLabel = document.createElement("label");
    trackingLabel.textContent = "Tracking ID";

    const trackingInput = document.createElement("input");
    trackingInput.type = "text";
    trackingInput.placeholder = "Tracking ID";
    trackingInput.value = order.trackingId || "";

    const saveButton = document.createElement("button");
    saveButton.className = "button";
    saveButton.textContent = "Save Update";

    saveButton.addEventListener("click", async () => {
      const newStatus = statusSelect.value;
      const trackingId = trackingInput.value.trim();

      if (newStatus === "Shipped" && !trackingId) {
        alert("Tracking ID is required when the order is Shipped.");
        trackingInput.focus();
        return;
      }

      saveButton.disabled = true;
      saveButton.textContent = "Saving…";

      try {
        await updateDoc(doc(db, "orders", order.id), {
          status: newStatus,
          trackingId,
          updatedAt: serverTimestamp()
        });
        saveButton.textContent = "Saved ✓";
        setTimeout(() => {
          saveButton.textContent = "Save Update";
          saveButton.disabled = false;
        }, 1200);
      } catch (error) {
        console.error(error);
        saveButton.textContent = "Error";
        saveButton.disabled = false;
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "button button-delete";
    deleteButton.textContent = "Delete Order";

    deleteButton.addEventListener("click", async () => {
      const number = order.orderId || order.id;
      if (!window.confirm(`Delete order ${number}? This cannot be undone.`)) return;

      deleteButton.disabled = true;
      deleteButton.textContent = "Deleting…";

      try {
        await deleteDoc(doc(db, "orders", order.id));
      } catch (error) {
        console.error(error);
        deleteButton.textContent = "Delete Error";
        deleteButton.disabled = false;
      }
    });

    statusLabel.appendChild(statusSelect);
    card.append(title, customer, product, amount, statusLabel, trackingLabel, trackingInput,
      saveButton, deleteButton);
    ordersList.appendChild(card);
  });
}

function renderOrderHistory() {
  if (!allOrders.length) {
    orderHistoryList.innerHTML = `<p class="muted">No order history yet.</p>`;
    return;
  }

  orderHistoryList.innerHTML = "";

  allOrders.forEach((order) => {
    const card = document.createElement("div");
    card.className = "order-card order-card--readonly";

    const title = document.createElement("h3");
    title.textContent = order.orderId || order.id;

    const fields = [
      ["Customer", order.customer],
      ["Phone", order.phone],
      ["Product", order.product],
      ["Size", order.size],
      ["Colour", order.colour],
      ["Quantity", order.quantity || 1],
      ["Amount", `₹${order.amount || 0}`],
      ["Payment", order.payment],
      ["Address", order.address],
      ["Status", order.status || "Confirmed"],
      ["Tracking ID", order.trackingId || "-"]
    ];

    fields.forEach(([label, value]) => {
      const p = document.createElement("p");
      p.textContent = `${label}: ${value || "-"}`;
      card.appendChild(p);
    });

    const actions = document.createElement("div");
    actions.className = "order-history-actions";

    const editButton = document.createElement("button");
    editButton.className = "button";
    editButton.textContent = "Edit Order";

    const deleteButton = document.createElement("button");
    deleteButton.className = "button button-delete";
    deleteButton.textContent = "Delete Order";

    editButton.addEventListener("click", () => startHistoryEdit(card, order));
    deleteButton.addEventListener("click", () => deleteHistoryOrder(order, deleteButton));

    actions.append(editButton, deleteButton);
    card.appendChild(actions);
    orderHistoryList.appendChild(card);
  });
}

function startHistoryEdit(card, order) {
  if (card.dataset.editing === "true") return;
  card.dataset.editing = "true";

  card.innerHTML = "";

  const title = document.createElement("h3");
  title.textContent = order.orderId || order.id;
  card.appendChild(title);

  const editor = document.createElement("div");
  editor.className = "order-history-editor";

  const inputs = {};

  const addInput = (labelText, type, value, options = []) => {
    const label = document.createElement("label");
    label.textContent = labelText;
    let input;

    if (type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 3;
      input.value = value || "";
    } else if (type === "select") {
      input = document.createElement("select");
      options.forEach((optionValue) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        option.selected = optionValue === value;
        input.appendChild(option);
      });
    } else {
      input = document.createElement("input");
      input.type = type;
      input.value = value ?? "";
      if (type === "number") input.min = "1";
    }

    inputs[labelText] = input;
    label.appendChild(input);
    editor.appendChild(label);
  };

  addInput("Customer", "text", order.customer);
  addInput("Phone", "tel", order.phone);
  addInput("Product", "text", order.product);
  addInput("Size", "select", order.size, ["XS", "S", "M", "L", "XL", "XXL"]);
  addInput("Colour", "select", order.colour, ["Black", "White"]);
  addInput("Quantity", "number", order.quantity || 1);
  addInput("Amount", "number", order.amount || 0);
  addInput("Payment", "select", order.payment, ["COD", "UPI", "Online Payment", "Paid"]);
  addInput("Address", "textarea", order.address);
  addInput("Tracking ID", "text", order.trackingId);

  addInput("Status", "select", order.status || "Confirmed",
    ["Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"]);

  const actions = document.createElement("div");
  actions.className = "order-history-actions";

  const save = document.createElement("button");
  save.className = "button";
  save.textContent = "Save Edit";

  const cancel = document.createElement("button");
  cancel.className = "button";
  cancel.textContent = "Cancel";

  save.addEventListener("click", async () => {
    const newStatus = inputs.Status.value;
    const trackingId = inputs["Tracking ID"].value.trim();

    if (newStatus === "Shipped" && !trackingId) {
      alert("Tracking ID is required when the order is Shipped.");
      inputs["Tracking ID"].focus();
      return;
    }

    save.disabled = true;
    cancel.disabled = true;
    save.textContent = "Saving…";

    try {
      await updateDoc(doc(db, "orders", order.id), {
        customer: inputs.Customer.value.trim(),
        phone: inputs.Phone.value.trim(),
        product: inputs.Product.value.trim(),
        size: inputs.Size.value,
        colour: inputs.Colour.value,
        quantity: Number(inputs.Quantity.value),
        amount: Number(inputs.Amount.value),
        payment: inputs.Payment.value,
        address: inputs.Address.value.trim(),
        status: newStatus,
        trackingId,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(error);
      alert("Could not update this order. Please try again.");
      save.disabled = false;
      cancel.disabled = false;
      save.textContent = "Save Edit";
    }
  });

  cancel.addEventListener("click", renderOrderHistory);

  actions.append(save, cancel);
  editor.appendChild(actions);
  card.appendChild(editor);
}

async function deleteHistoryOrder(order, button) {
  const number = order.orderId || order.id;
  if (!window.confirm(
    `Permanently delete order ${number}? This removes it from Order History too. The order number will NOT be reused.`
  )) return;

  button.disabled = true;
  button.textContent = "Deleting…";

  try {
    await deleteDoc(doc(db, "orders", order.id));
  } catch (error) {
    console.error(error);
    button.disabled = false;
    button.textContent = "Delete Error";
    alert("Could not delete this order. Please try again.");
  }
}

logoutButton.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "admin.html";
});

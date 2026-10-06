import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const ADMIN_EMAIL = "kmuhammedjuzair@gmail.com";
const CLOUDINARY_CLOUD_NAME = "lls4diyv";
const CLOUDINARY_UPLOAD_PRESET = "barakahh_products";
const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);
const $ = id => document.getElementById(id);
let currentUser = null, products = [], editingId = null;
const SIZES = ["XS","S","M","L","XL","XXL"];

onAuthStateChanged(auth, user => {
  if (!user) { location.href="admin.html"; return; }
  if (user.email !== ADMIN_EMAIL) { $("status").textContent="This account is not authorized."; return; }
  currentUser=user; $("status").textContent=`Signed in as ${user.email}`; listenProducts();
});

function listenProducts(){
  onSnapshot(collection(db,"products"), snap=>{
    products=snap.docs.map(x=>({id:x.id,...x.data()}));
    products.sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
    render();
  }, err=>{console.error(err);$("productList").innerHTML='<div class="empty">Unable to load products. Check Firestore rules.</div>';});
}
function render(){
  const q=$("search").value.trim().toLowerCase();
  const list=products.filter(p=>!q||String(p.name||"").toLowerCase().includes(q)||String(p.sku||"").toLowerCase().includes(q));
  $("productList").innerHTML="";
  if(!list.length){$("productList").innerHTML='<div class="empty">No products yet. Add your first product.</div>';return;}
  list.forEach(p=>{
    const c=document.createElement("div");c.className="product-card";
    const top=document.createElement("div");top.className="product-top";
    const t=document.createElement("div");const h=document.createElement("h3");h.textContent=p.name||"Untitled";const s=document.createElement("div");s.className="muted";s.textContent=p.sku||"No SKU";t.append(h,s);
    const b=document.createElement("span");b.className="badge";b.textContent=p.status||"Active";top.append(t,b);c.append(top);
    const price=document.createElement("div");price.className="price";price.textContent=`₹${Number(p.price||0)}`;c.append(price);
    let total=0; const vars=p.variants||{};
    Object.entries(vars).forEach(([colour,sizes])=>Object.entries(sizes||{}).forEach(([size,stock])=>{
      const n=Number(stock||0);total+=n;const r=document.createElement("div");r.className="variant";const l=document.createElement("span");l.textContent=`${colour} ${size}`;const v=document.createElement("span");v.textContent=`${n} in stock`;v.className=n===0?"zero":n<=3?"low":"ok";r.append(l,v);c.append(r);
    }));
    if(!Object.keys(vars).length){const m=document.createElement("p");m.className="muted";m.textContent="No variants added.";c.append(m);}
    const tot=document.createElement("p");tot.className="muted";tot.textContent=`Total stock: ${total}`;c.append(tot);
    const a=document.createElement("div");a.className="actions";const e=document.createElement("button");e.textContent="Edit";e.onclick=()=>openEditor(p);const d=document.createElement("button");d.className="danger";d.textContent="Delete";d.onclick=()=>removeProduct(p);a.append(e,d);c.append(a);$("productList").append(c);
  });
}
function openEditor(p=null){
  editingId=p?.id||null;$("editorCard").hidden=false;$("editorTitle").textContent=p?"Edit Product":"Add Product";$("formMessage").textContent="";
  $("name").value=p?.name||"";$("sku").value=p?.sku||"";$("price").value=p?.price??499;$("productStatus").value=p?.status||"Active";$("description").value=p?.description||"";$("photos").value=(p?.photos||[]).join("\n");
  $("variants").innerHTML="";const vars=p?.variants||{};const colours=Object.keys(vars);(colours.length?colours:["Black"]).forEach(c=>addColour(c,vars[c]||{}));$("editorCard").scrollIntoView({behavior:"smooth"});
}
function addColour(name="",stock={}){
  const block=document.createElement("div");block.className="colour-block";
  const head=document.createElement("div");head.className="colour-head";const lab=document.createElement("label");lab.textContent="Colour";const input=document.createElement("input");input.className="colour-name";input.required=true;input.value=name;lab.append(input);
  const rm=document.createElement("button");rm.type="button";rm.className="danger";rm.textContent="Remove";rm.onclick=()=>block.remove();head.append(lab,rm);block.append(head);
  const grid=document.createElement("div");grid.className="size-grid";SIZES.forEach(size=>{const l=document.createElement("label");l.textContent=`${size} stock`;const i=document.createElement("input");i.type="number";i.min="0";i.value=stock[size]??0;i.className="size-stock";i.dataset.size=size;l.append(i);grid.append(l);});block.append(grid);$("variants").append(block);
}
$("productForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!currentUser)return;
  const btn=$("saveProduct");btn.disabled=true;btn.textContent="Saving…";$("formMessage").textContent="";
  try{
    const variants={};document.querySelectorAll(".colour-block").forEach(block=>{const colour=block.querySelector(".colour-name").value.trim();if(!colour)return;variants[colour]={};block.querySelectorAll(".size-stock").forEach(i=>variants[colour][i.dataset.size]=Math.max(0,Number(i.value||0)));});
    const data={name:$("name").value.trim(),sku:$("sku").value.trim(),price:Number($("price").value||0),status:$("productStatus").value,description:$("description").value.trim(),photos:$("photos").value.split("\n").map(x=>x.trim()).filter(Boolean),variants,updatedAt:serverTimestamp(),updatedBy:currentUser.email};
    if(!data.name||!data.sku)throw Error("Product name and SKU are required.");
    if(editingId)await updateDoc(doc(db,"products",editingId),data);else await addDoc(collection(db,"products"),{...data,createdAt:serverTimestamp(),createdBy:currentUser.email});
    $("formMessage").textContent=editingId?"Product updated successfully.":"Product created successfully.";setTimeout(closeEditor,500);
  }catch(err){console.error(err);$("formMessage").textContent=err.message||"Could not save product.";}
  finally{btn.disabled=false;btn.textContent="Save Product";}
});
async function removeProduct(p){if(!confirm(`Delete ${p.name||"this product"}? This cannot be undone.`))return;try{await deleteDoc(doc(db,"products",p.id));}catch(e){console.error(e);alert("Could not delete the product.");}}
function closeEditor(){editingId=null;$("editorCard").hidden=true;$("productForm").reset();$("price").value=499;$("productStatus").value="Active";$("variants").innerHTML="";$("formMessage").textContent="";}
$("addProduct").onclick=()=>openEditor();$("addColour").onclick=()=>addColour();$("cancelEdit").onclick=closeEditor;$("search").oninput=render;
$("backButton").onclick=()=>location.href="admin-dashboard.html";
$("logout").onclick=async()=>{await signOut(auth);location.href="admin.html";};

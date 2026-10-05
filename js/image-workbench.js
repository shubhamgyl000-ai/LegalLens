(() => {
  const input = document.getElementById("image");
  const upload = document.querySelector(".upload");
  if (!input || !upload) return;

  input.multiple = true;
  const workbench = document.createElement("section");
  workbench.className = "image-workbench";
  workbench.innerHTML = '<div class="workbench-head"><div><h2>Selected photos</h2><p>Add, preview, rotate, crop, or remove photos before scanning.</p></div><span class="photo-count">0 photos</span></div><div class="photo-grid"></div><button type="button" class="add-more">+ Add more photos</button>';
  upload.insertAdjacentElement("afterend", workbench);

  let files = [];
  let editIndex = -1;
  const grid = workbench.querySelector(".photo-grid");
  const count = workbench.querySelector(".photo-count");

  function sync() {
    const dt = new DataTransfer();
    files.forEach(f => dt.items.add(f));
    input.files = dt.files;
    count.textContent = files.length + (files.length === 1 ? " photo" : " photos");
    grid.innerHTML = "";
    files.forEach((file, i) => {
      const card = document.createElement("article");
      card.className = "photo-item";
      card.innerHTML = '<img alt="Selected food package photo"><div class="photo-tools"><button type="button" data-edit>Edit</button><button type="button" data-remove>Remove</button></div>';
      const img = card.querySelector("img");
      img.src = URL.createObjectURL(file);
      card.querySelector("[data-edit]").onclick = () => openEditor(i);
      card.querySelector("[data-remove]").onclick = () => { files.splice(i,1); sync(); };
      grid.appendChild(card);
    });
    document.getElementById("scanBtn").disabled = !files.length;
    document.getElementById("status").textContent = files.length ? "Photos ready. You can edit them or scan all." : "";
  }

  input.addEventListener("change", () => {
    const incoming = [...input.files];
    const keys = new Set(files.map(f => f.name + f.size + f.lastModified));
    incoming.forEach(f => { const k=f.name+f.size+f.lastModified; if(!keys.has(k)) files.push(f); });
    sync();
  });

  workbench.querySelector(".add-more").onclick = () => input.click();

  function openEditor(i) {
    editIndex = i;
    const old = workbench.querySelector(".editor");
    if (old) old.remove();
    const editor = document.createElement("div");
    editor.className = "editor";
    editor.innerHTML = '<div class="editor-panel"><h3>Edit photo</h3><canvas></canvas><div class="editor-controls"><button type="button" data-rot>↻ Rotate</button><button type="button" data-crop>Crop center</button><button type="button" data-save>Save copy</button><button type="button" data-close>Close</button></div></div>';
    workbench.appendChild(editor);
    const canvas=editor.querySelector("canvas"), ctx=canvas.getContext("2d"), img=new Image();
    img.onload=()=>draw(img,0);
    img.src=URL.createObjectURL(files[i]);
    let rotation=0;
    function draw(source,r) {
      const swap=Math.abs(r/90)%2===1;
      canvas.width=swap?source.height:source.width; canvas.height=swap?source.width:source.height;
      ctx.save(); ctx.translate(canvas.width/2,canvas.height/2); ctx.rotate(r*Math.PI/180);
      ctx.drawImage(source,-source.width/2,-source.height/2); ctx.restore();
    }
    editor.querySelector("[data-rot]").onclick=()=>{rotation=(rotation+90)%360;draw(img,rotation);};
    editor.querySelector("[data-crop]").onclick=()=>{
      const side=Math.min(canvas.width,canvas.height)*.8, sx=(canvas.width-side)/2, sy=(canvas.height-side)/2;
      const tmp=document.createElement("canvas"); tmp.width=side; tmp.height=side; tmp.getContext("2d").drawImage(canvas,sx,sy,side,side,0,0,side,side);
      canvas.width=side;canvas.height=side;ctx.drawImage(tmp,0,0);
    };
    editor.querySelector("[data-save]").onclick=()=>canvas.toBlob(blob=>{files[i]=new File([blob],files[i].name.replace(/\.[^.]+$/,"")+"_edited.jpg",{type:"image/jpeg"});sync();editor.remove();},"image/jpeg",.92);
    editor.querySelector("[data-close]").onclick=()=>editor.remove();
  }
})();
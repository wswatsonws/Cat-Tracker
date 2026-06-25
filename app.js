const STORAGE_KEY = "money-cat-tracker-records-v1";
const SUPABASE_URL = "https://kciebvyryqblfmbamasp.supabase.co";
const SUPABASE_KEY = "sb_publishable_XUQPY1_R98Ce11GTeFlaMA_3Ir5pXf3";
const OWNER_LABELS = {
  unknown: "未知",
  suspected_lucky: "疑似 Lucky",
  money: "确认 Money",
  lucky: "确认 Lucky",
  exclude_money: "排除 Money",
};

if (!window.supabase) {
  document.addEventListener("DOMContentLoaded", () => {
    const message = document.querySelector("#authMessage");
    if (message) {
      message.textContent = "Supabase 登录库没有加载成功，请刷新页面或检查网络。";
    }
  });
  throw new Error("Supabase client library failed to load");
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let records = [];
let currentUser = null;
let currentFamily = null;

const els = {
  authPanel: document.querySelector("#authPanel"),
  familyPanel: document.querySelector("#familyPanel"),
  appMain: document.querySelector("#appMain"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  authMessage: document.querySelector("#authMessage"),
  newPassword: document.querySelector("#newPassword"),
  passwordMessage: document.querySelector("#passwordMessage"),
  familyMessage: document.querySelector("#familyMessage"),
  joinFamilyId: document.querySelector("#joinFamilyId"),
  userEmail: document.querySelector("#userEmail"),
  syncStatus: document.querySelector("#syncStatus"),
  familyIdLabel: document.querySelector("#familyIdLabel"),
  tabs: document.querySelectorAll(".tab"),
  tabbar: document.querySelector(".tabbar"),
  views: document.querySelectorAll(".view"),
  form: document.querySelector("#recordForm"),
  editingId: document.querySelector("#editingId"),
  date: document.querySelector("#recordDate"),
  time: document.querySelector("#recordTime"),
  note: document.querySelector("#recordNote"),
  leftUrines: document.querySelector("#leftUrines"),
  rightUrines: document.querySelector("#rightUrines"),
  leftStoolCount: document.querySelector("#leftStoolCount"),
  rightStoolCount: document.querySelector("#rightStoolCount"),
  leftStoolNote: document.querySelector("#leftStoolNote"),
  rightStoolNote: document.querySelector("#rightStoolNote"),
  liveTotal: document.querySelector("#liveTotal"),
  todaySummary: document.querySelector("#todaySummary"),
  todayRecords: document.querySelector("#todayRecords"),
  todayAlerts: document.querySelector("#todayAlerts"),
  historyDate: document.querySelector("#historyDate"),
  historyRecords: document.querySelector("#historyRecords"),
  trendMode: document.querySelector("#trendMode"),
  trendAlerts: document.querySelector("#trendAlerts"),
  trendChart: document.querySelector("#trendChart"),
  trendTable: document.querySelector("#trendTable"),
  urineTemplate: document.querySelector("#urineTemplate"),
};

init();

async function init() {
  const now = new Date();
  els.date.value = toDateValue(now);
  els.time.value = toTimeValue(now);
  els.historyDate.value = toDateValue(now);
  addUrine("left");
  addUrine("right");

  bindEvents();
  await restoreSession();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function bindEvents() {
  document.querySelector("#signUpButton").addEventListener("click", signUp);
  document.querySelector("#signInButton").addEventListener("click", signIn);
  document.querySelector("#forgotPasswordButton").addEventListener("click", resetPassword);
  document.querySelector("#changePasswordButton").addEventListener("click", changePassword);
  document.querySelector("#signOutButton").addEventListener("click", signOut);
  document.querySelector("#signOutNoFamilyButton").addEventListener("click", signOut);
  document.querySelector("#createFamilyButton").addEventListener("click", createFamily);
  document.querySelector("#joinFamilyButton").addEventListener("click", joinFamily);
  document.querySelector("#copyFamilyIdButton").addEventListener("click", copyFamilyId);

  document.querySelectorAll("[data-open-tab]").forEach((button) => {
    button.addEventListener("click", () => openTab(button.dataset.openTab));
  });

  document.querySelectorAll("[data-add-urine]").forEach((button) => {
    button.addEventListener("click", () => addUrine(button.dataset.addUrine));
  });

  els.tabs.forEach((tab) => tab.addEventListener("click", () => openTab(tab.dataset.tab)));
  els.form.addEventListener("input", updateLiveTotal);
  els.form.addEventListener("submit", saveForm);
  document.querySelector("#resetFormButton").addEventListener("click", resetForm);
  els.historyDate.addEventListener("change", renderAll);
  els.trendMode.addEventListener("change", renderAll);
  document.querySelector("#downloadCsvButton").addEventListener("click", downloadCsv);
  document.querySelector("#downloadJsonButton").addEventListener("click", downloadJson);
  document.querySelector("#importJsonButton").addEventListener("click", importJson);
  document.querySelector("#importLocalButton").addEventListener("click", importLocalRecords);
  document.querySelector("#installHintButton").addEventListener("click", () => {
    alert("在 iPhone Safari 中打开后，点分享按钮，再选择“添加到主屏幕”。");
  });
}

async function restoreSession() {
  setStatus("正在检查登录状态...");
  const { data } = await db.auth.getSession();
  currentUser = data.session?.user || null;
  if (!currentUser) {
    showAuth();
    return;
  }
  await afterLogin();
}

async function signUp() {
  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  if (!email || !password) return setAuthMessage("请输入邮箱和密码。");
  setAuthBusy(true, "正在注册...");
  try {
    const { error } = await db.auth.signUp({ email, password });
    if (error) {
      setAuthMessage(`注册失败：${error.message}`);
      alert(`注册失败：${error.message}`);
      return;
    }
    setAuthMessage("注册完成。如果 Supabase 要求验证邮箱，请先去邮箱点确认链接，然后再登录。");
    alert("注册请求已提交。如果收到确认邮件，请先点邮件里的确认链接，再回到这里登录。");
  } catch (error) {
    setAuthMessage(`注册失败：${error.message}`);
    alert(`注册失败：${error.message}`);
  } finally {
    setAuthBusy(false);
  }
}

async function signIn() {
  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  if (!email || !password) return setAuthMessage("请输入邮箱和密码。");
  setAuthBusy(true, "正在登录...");
  try {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthMessage(`登录失败：${error.message}`);
      alert(`登录失败：${error.message}`);
      return;
    }
    currentUser = data.user;
    await afterLogin();
  } catch (error) {
    setAuthMessage(`登录失败：${error.message}`);
    alert(`登录失败：${error.message}`);
  } finally {
    setAuthBusy(false);
  }
}

async function resetPassword() {
  const email = els.authEmail.value.trim();
  if (!email) return setAuthMessage("请输入邮箱，然后再点忘记密码。");
  setAuthBusy(true, "正在发送重置邮件...");
  try {
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: "https://wswatsonws.github.io/Cat-Tracker/",
    });
    if (error) {
      setAuthMessage(`发送失败：${error.message}`);
      alert(`发送失败：${error.message}`);
      return;
    }
    setAuthMessage("重置邮件已发送。请打开邮件里的链接，再设置新密码。");
    alert("重置邮件已发送。请打开邮件里的链接，再设置新密码。");
  } catch (error) {
    setAuthMessage(`发送失败：${error.message}`);
    alert(`发送失败：${error.message}`);
  } finally {
    setAuthBusy(false);
  }
}

async function changePassword() {
  const password = els.newPassword.value;
  if (!password || password.length < 6) {
    setPasswordMessage("新密码至少 6 位。");
    return;
  }
  document.querySelector("#changePasswordButton").disabled = true;
  setPasswordMessage("正在修改密码...");
  try {
    const { error } = await db.auth.updateUser({ password });
    if (error) {
      setPasswordMessage(`修改失败：${error.message}`);
      alert(`修改失败：${error.message}`);
      return;
    }
    els.newPassword.value = "";
    setPasswordMessage("密码已修改。下次登录请使用新密码。");
    alert("密码已修改。下次登录请使用新密码。");
  } catch (error) {
    setPasswordMessage(`修改失败：${error.message}`);
    alert(`修改失败：${error.message}`);
  } finally {
    document.querySelector("#changePasswordButton").disabled = false;
  }
}

async function signOut() {
  await db.auth.signOut();
  currentUser = null;
  currentFamily = null;
  records = [];
  showAuth();
}

async function afterLogin() {
  els.userEmail.textContent = currentUser.email || "已登录";
  const family = await getMyFamily();
  if (!family) {
    showFamilySetup();
    return;
  }
  currentFamily = family;
  await loadRecords();
  showApp();
}

async function getMyFamily() {
  const { data, error } = await db
    .from("family_members")
    .select("family_id, families(id, name)")
    .eq("user_id", currentUser.id)
    .limit(1)
    .maybeSingle();
  if (error) {
    setFamilyMessage(error.message);
    return null;
  }
  return data?.families || null;
}

async function createFamily() {
  setFamilyMessage("正在创建家庭空间...");
  const family = {
    id: crypto.randomUUID(),
    name: "Money & Lucky",
    owner_id: currentUser.id,
  };
  const { error: familyError } = await db
    .from("families")
    .insert(family);
  if (familyError) return setFamilyMessage(familyError.message);

  const { error: memberError } = await db
    .from("family_members")
    .insert({ family_id: family.id, user_id: currentUser.id, role: "owner" });
  if (memberError) return setFamilyMessage(memberError.message);

  currentFamily = family;
  await loadRecords();
  showApp();
}

async function joinFamily() {
  const familyId = els.joinFamilyId.value.trim();
  if (!familyId) return setFamilyMessage("请输入家庭 ID。");
  setFamilyMessage("正在加入家庭空间...");
  const { error } = await db
    .from("family_members")
    .insert({ family_id: familyId, user_id: currentUser.id, role: "member" });
  if (error) return setFamilyMessage(error.message);
  currentFamily = { id: familyId, name: "Money & Lucky" };
  await loadRecords();
  showApp();
}

async function loadRecords() {
  setStatus("正在从云端读取...");
  const { data, error } = await db
    .from("litter_records")
    .select("*")
    .eq("family_id", currentFamily.id)
    .order("record_date", { ascending: false })
    .order("record_time", { ascending: false });
  if (error) {
    setStatus(error.message);
    records = [];
    renderAll();
    return;
  }
  records = data.map(fromDbRecord);
  setStatus(`云端同步已启用，共 ${records.length} 条记录`);
  renderAll();
}

function showAuth() {
  els.authPanel.classList.remove("hidden");
  els.familyPanel.classList.add("hidden");
  els.appMain.classList.add("hidden");
  els.tabbar.classList.add("hidden");
  setAuthMessage("");
}

function showFamilySetup() {
  els.authPanel.classList.add("hidden");
  els.familyPanel.classList.remove("hidden");
  els.appMain.classList.add("hidden");
  els.tabbar.classList.add("hidden");
  setFamilyMessage("");
}

function showApp() {
  els.authPanel.classList.add("hidden");
  els.familyPanel.classList.add("hidden");
  els.appMain.classList.remove("hidden");
  els.tabbar.classList.remove("hidden");
  els.familyIdLabel.textContent = currentFamily.id;
  renderAll();
}

function openTab(tabName) {
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `view-${tabName}`));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function addUrine(box, urine = {}) {
  const node = els.urineTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.box = box;
  node.querySelector('[data-field="length"]').value = urine.length ?? "";
  node.querySelector('[data-field="width"]').value = urine.width ?? "";
  node.querySelector('[data-field="height"]').value = urine.height ?? "";
  node.querySelector('[data-field="owner"]').value = urine.owner ?? "unknown";
  node.querySelector(".remove-urine").addEventListener("click", () => {
    node.remove();
    updateLiveTotal();
  });
  node.addEventListener("input", () => updateUrineVolume(node));
  (box === "left" ? els.leftUrines : els.rightUrines).appendChild(node);
  updateUrineVolume(node);
}

function updateUrineVolume(node) {
  const urine = readUrineNode(node);
  node.querySelector(".volume-label").textContent = `${formatNumber(volumeOf(urine))} cm³`;
  updateLiveTotal();
}

function readUrineNode(node) {
  return {
    length: numberValue(node.querySelector('[data-field="length"]').value),
    width: numberValue(node.querySelector('[data-field="width"]').value),
    height: numberValue(node.querySelector('[data-field="height"]').value),
    owner: node.querySelector('[data-field="owner"]').value,
  };
}

function readUrines(box) {
  const list = box === "left" ? els.leftUrines : els.rightUrines;
  return [...list.querySelectorAll(".urine-item")]
    .map(readUrineNode)
    .filter((urine) => urine.length || urine.width || urine.height);
}

async function saveForm(event) {
  event.preventDefault();
  const id = els.editingId.value || crypto.randomUUID();
  const existing = records.find((record) => record.id === id);
  const record = {
    id,
    date: els.date.value,
    time: els.time.value,
    boxes: {
      left: {
        urines: readUrines("left"),
        stoolCount: integerValue(els.leftStoolCount.value),
        stoolNote: els.leftStoolNote.value.trim(),
      },
      right: {
        urines: readUrines("right"),
        stoolCount: integerValue(els.rightStoolCount.value),
        stoolNote: els.rightStoolNote.value.trim(),
      },
    },
    note: els.note.value.trim(),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  setStatus("正在保存...");
  const { data, error } = await db
    .from("litter_records")
    .upsert(toDbRecord(record), { onConflict: "id" })
    .select()
    .single();
  if (error) {
    setStatus(error.message);
    alert(error.message);
    return;
  }

  const saved = fromDbRecord(data);
  records = existing ? records.map((item) => (item.id === id ? saved : item)) : [saved, ...records];
  resetForm();
  renderAll();
  setStatus("已保存到云端");
  openTab("today");
}

function resetForm() {
  els.editingId.value = "";
  els.form.reset();
  const now = new Date();
  els.date.value = toDateValue(now);
  els.time.value = toTimeValue(now);
  els.leftUrines.innerHTML = "";
  els.rightUrines.innerHTML = "";
  addUrine("left");
  addUrine("right");
  updateLiveTotal();
}

function editRecord(id) {
  const record = records.find((item) => item.id === id);
  if (!record) return;
  els.editingId.value = record.id;
  els.date.value = record.date;
  els.time.value = record.time;
  els.note.value = record.note || "";
  els.leftStoolCount.value = record.boxes.left.stoolCount || 0;
  els.rightStoolCount.value = record.boxes.right.stoolCount || 0;
  els.leftStoolNote.value = record.boxes.left.stoolNote || "";
  els.rightStoolNote.value = record.boxes.right.stoolNote || "";
  els.leftUrines.innerHTML = "";
  els.rightUrines.innerHTML = "";
  (record.boxes.left.urines.length ? record.boxes.left.urines : [{}]).forEach((urine) => addUrine("left", urine));
  (record.boxes.right.urines.length ? record.boxes.right.urines : [{}]).forEach((urine) => addUrine("right", urine));
  updateLiveTotal();
  openTab("add");
}

async function deleteRecord(id) {
  if (!confirm("删除这条记录？")) return;
  setStatus("正在删除...");
  const { error } = await db.from("litter_records").delete().eq("id", id);
  if (error) {
    setStatus(error.message);
    alert(error.message);
    return;
  }
  records = records.filter((item) => item.id !== id);
  renderAll();
  setStatus("已删除");
}

function updateLiveTotal() {
  const draft = {
    boxes: {
      left: {
        urines: readUrines("left"),
        stoolCount: integerValue(els.leftStoolCount.value),
      },
      right: {
        urines: readUrines("right"),
        stoolCount: integerValue(els.rightStoolCount.value),
      },
    },
  };
  const total = summarizeRecord(draft);
  els.liveTotal.textContent = `本次合计：尿块 ${total.urineCount} 个，估算体积 ${formatNumber(total.totalVolume)} cm³；排除明显 Lucky 后 ${formatNumber(total.moneyWatchVolume)} cm³；屎块 ${total.stoolCount} 个。`;
}

function renderAll() {
  renderToday();
  renderHistory();
  renderTrends();
}

function renderToday() {
  const today = toDateValue(new Date());
  const todayRecords = sortRecords(records.filter((record) => record.date === today));
  const todayTotal = summarizeRecords(todayRecords);
  els.todaySummary.innerHTML = [
    metric("检查次数", `${todayRecords.length} 次`),
    metric("尿块", `${todayTotal.urineCount} 个`),
    metric("估算体积", `${formatNumber(todayTotal.totalVolume)} cm³`),
    metric("屎块", `${todayTotal.stoolCount} 个`),
  ].join("");
  els.todayAlerts.innerHTML = renderAlerts(today, "today");
  els.todayRecords.innerHTML = todayRecords.length ? todayRecords.map(renderRecordCard).join("") : emptyState("今天还没有记录");
  bindRecordButtons(els.todayRecords);
}

function renderHistory() {
  const selected = els.historyDate.value;
  const filtered = selected ? records.filter((record) => record.date === selected) : records;
  els.historyRecords.innerHTML = filtered.length ? sortRecords(filtered).map(renderRecordCard).join("") : emptyState("这个日期没有记录");
  bindRecordButtons(els.historyRecords);
}

function renderTrends() {
  const mode = els.trendMode.value;
  const daily = summarizeByDay(records, mode);
  const maxVolume = Math.max(...daily.map((day) => day.volume), 1);
  els.trendAlerts.innerHTML = renderAlerts(toDateValue(new Date()), "trend");
  els.trendChart.innerHTML = daily.length
    ? daily.slice(-14).map((day) => {
      const width = Math.max(4, (day.volume / maxVolume) * 100);
      return `<div class="bar-row"><span>${shortDate(day.date)}</span><div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div><strong>${formatNumber(day.volume)}</strong></div>`;
    }).join("")
    : emptyState("暂无趋势数据");
  els.trendTable.innerHTML = daily.length
    ? [
      `<div class="trend-table-row"><strong>日期</strong><strong>尿块</strong><strong>体积</strong><strong>屎块</strong></div>`,
      ...daily.slice(-14).reverse().map((day) => `<div class="trend-table-row"><span>${day.date}</span><span>${day.urineCount}</span><span>${formatNumber(day.volume)} cm³</span><span>${day.stoolCount}</span></div>`),
    ].join("")
    : "";
}

function renderRecordCard(record) {
  const total = summarizeRecord(record);
  return `
    <article class="record-card">
      <header>
        <div>
          <h3>${record.date} ${record.time}</h3>
          <div class="meta">尿块 ${total.urineCount} 个 · ${formatNumber(total.totalVolume)} cm³ · 屎块 ${total.stoolCount} 个</div>
        </div>
        <div class="meta">Money 观察 ${formatNumber(total.moneyWatchVolume)} cm³</div>
      </header>
      <div class="box-lines">
        ${renderBoxLine("左盆", record.boxes.left)}
        ${renderBoxLine("右盆", record.boxes.right)}
      </div>
      ${record.note ? `<p class="muted">${escapeHtml(record.note)}</p>` : ""}
      <div class="record-actions">
        <button class="secondary-button" type="button" data-edit="${record.id}">编辑</button>
        <button class="secondary-button" type="button" data-delete="${record.id}">删除</button>
      </div>
    </article>
  `;
}

function renderBoxLine(label, box) {
  const urineText = box.urines.length
    ? box.urines.map((urine) => `${formatNumber(urine.length)}×${formatNumber(urine.width)}×${formatNumber(urine.height)} ${OWNER_LABELS[urine.owner]}`).join("，")
    : "无尿块";
  const stoolText = `${box.stoolCount || 0} 个屎块${box.stoolNote ? `，${escapeHtml(box.stoolNote)}` : ""}`;
  return `<div class="box-line"><strong>${label}</strong>：${escapeHtml(urineText)}；${stoolText}</div>`;
}

function bindRecordButtons(container) {
  container.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editRecord(button.dataset.edit));
  });
  container.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteRecord(button.dataset.delete));
  });
}

function renderAlerts(date, placement) {
  const daily = summarizeByDay(records, "money");
  const currentIndex = daily.findIndex((day) => day.date === date);
  if (currentIndex < 0) return "";
  const current = daily[currentIndex];
  const previous = daily.slice(Math.max(0, currentIndex - 7), currentIndex).filter((day) => day.urineCount > 0);
  const messages = [];

  if (previous.length >= 3) {
    const average = previous.reduce((sum, day) => sum + day.volume, 0) / previous.length;
    if (current.volume > 0 && current.volume < average * 0.55) {
      messages.push(`今天排除明显 Lucky 后的估算体积低于近 ${previous.length} 天平均水平，建议继续留意。`);
    }
  }

  const noteText = records.filter((record) => record.date === date).map((record) => record.note).join(" ");
  if (/尿不出|频繁|血尿|痛苦|惨叫|呕吐|精神差|尿闭/.test(noteText)) {
    messages.push("备注里出现高风险症状关键词。这个提醒不是诊断；如果 Money 状态不对，建议及时联系兽医。");
  }

  if (!messages.length && placement === "trend") return "";
  if (!messages.length) return `<div class="alert">暂无明显偏低趋势。记录有误差，继续观察即可。</div>`;
  return messages.map((message) => `<div class="alert">${message}</div>`).join("");
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function emptyState(text) {
  return `<div class="alert">${text}</div>`;
}

function summarizeRecord(record) {
  const boxes = [record.boxes.left, record.boxes.right];
  const urines = boxes.flatMap((box) => box.urines || []);
  return {
    urineCount: urines.length,
    totalVolume: urines.reduce((sum, urine) => sum + volumeOf(urine), 0),
    moneyWatchVolume: urines
      .filter((urine) => !["lucky", "suspected_lucky", "exclude_money"].includes(urine.owner))
      .reduce((sum, urine) => sum + volumeOf(urine), 0),
    stoolCount: boxes.reduce((sum, box) => sum + (box.stoolCount || 0), 0),
  };
}

function summarizeRecords(items) {
  return items.map(summarizeRecord).reduce((acc, total) => ({
    urineCount: acc.urineCount + total.urineCount,
    totalVolume: acc.totalVolume + total.totalVolume,
    moneyWatchVolume: acc.moneyWatchVolume + total.moneyWatchVolume,
    stoolCount: acc.stoolCount + total.stoolCount,
  }), { urineCount: 0, totalVolume: 0, moneyWatchVolume: 0, stoolCount: 0 });
}

function summarizeByDay(items, mode) {
  const days = new Map();
  sortRecords(items).forEach((record) => {
    const total = summarizeRecord(record);
    const current = days.get(record.date) || { date: record.date, urineCount: 0, volume: 0, stoolCount: 0 };
    current.urineCount += total.urineCount;
    current.volume += mode === "money" ? total.moneyWatchVolume : total.totalVolume;
    current.stoolCount += total.stoolCount;
    days.set(record.date, current);
  });
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function sortRecords(items) {
  return [...items].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}

function toDbRecord(record) {
  const row = {
    id: record.id,
    family_id: currentFamily.id,
    record_date: record.date,
    record_time: record.time,
    boxes: record.boxes,
    note: record.note,
    updated_by: currentUser.id,
  };
  if (!records.some((item) => item.id === record.id)) {
    row.created_by = currentUser.id;
  }
  return row;
}

function fromDbRecord(row) {
  return {
    id: row.id,
    date: row.record_date,
    time: String(row.record_time || "").slice(0, 5),
    boxes: normalizeBoxes(row.boxes),
    note: row.note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeBoxes(boxes) {
  return {
    left: {
      urines: boxes?.left?.urines || [],
      stoolCount: boxes?.left?.stoolCount || 0,
      stoolNote: boxes?.left?.stoolNote || "",
    },
    right: {
      urines: boxes?.right?.urines || [],
      stoolCount: boxes?.right?.stoolCount || 0,
      stoolNote: boxes?.right?.stoolNote || "",
    },
  };
}

function volumeOf(urine) {
  return (Number(urine.length) || 0) * (Number(urine.width) || 0) * (Number(urine.height) || 0);
}

function downloadCsv() {
  const rows = [["date", "time", "box", "urine_length", "urine_width", "urine_height", "urine_volume", "owner", "stool_count", "stool_note", "record_note"]];
  sortRecords(records).reverse().forEach((record) => {
    ["left", "right"].forEach((boxName) => {
      const box = record.boxes[boxName];
      if (box.urines.length) {
        box.urines.forEach((urine) => rows.push([
          record.date,
          record.time,
          boxName,
          urine.length,
          urine.width,
          urine.height,
          formatNumber(volumeOf(urine)),
          urine.owner,
          box.stoolCount || 0,
          box.stoolNote || "",
          record.note || "",
        ]));
      } else {
        rows.push([record.date, record.time, boxName, "", "", "", "", "", box.stoolCount || 0, box.stoolNote || "", record.note || ""]);
      }
    });
  });
  downloadFile("money-cat-records.csv", rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
}

function downloadJson() {
  downloadFile("money-cat-records.json", JSON.stringify(records, null, 2), "application/json");
}

async function importJson() {
  const raw = document.querySelector("#importJson").value.trim();
  if (!raw) return;
  try {
    const imported = JSON.parse(raw);
    if (!Array.isArray(imported)) throw new Error("not-array");
    await uploadImportedRecords(imported);
    alert("导入完成");
  } catch (error) {
    alert(error.message === "not-array" ? "JSON 格式不正确" : error.message);
  }
}

async function importLocalRecords() {
  const local = loadLocalRecords();
  if (!local.length) {
    alert("这台设备没有找到旧的本机记录。");
    return;
  }
  if (!confirm(`找到 ${local.length} 条旧记录，导入到当前家庭空间？`)) return;
  await uploadImportedRecords(local);
  localStorage.removeItem(STORAGE_KEY);
}

async function uploadImportedRecords(items) {
  const rows = items.map((item) => toDbRecord({
    ...item,
    id: item.id || crypto.randomUUID(),
    boxes: normalizeBoxes(item.boxes),
    note: item.note || "",
  }));
  const { error } = await db.from("litter_records").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(error.message);
  await loadRecords();
}

function loadLocalRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

async function copyFamilyId() {
  await navigator.clipboard.writeText(currentFamily.id);
  setStatus("家庭 ID 已复制");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function numberValue(value) {
  return value === "" ? 0 : Number(value);
}

function integerValue(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}

function toDateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toTimeValue(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function shortDate(date) {
  return date.slice(5).replace("-", "/");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(message) {
  els.syncStatus.textContent = message;
}

function setAuthMessage(message) {
  els.authMessage.textContent = message;
}

function setFamilyMessage(message) {
  els.familyMessage.textContent = message;
}

function setPasswordMessage(message) {
  els.passwordMessage.textContent = message;
}

function setAuthBusy(isBusy, message = "") {
  document.querySelector("#signUpButton").disabled = isBusy;
  document.querySelector("#signInButton").disabled = isBusy;
  document.querySelector("#forgotPasswordButton").disabled = isBusy;
  if (message) setAuthMessage(message);
}

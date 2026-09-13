(function () {
	"use strict";

	var CONFIG = { owner: "Abhishekmishra-17", repo: "abhishekmishra-17.github.io" };
	var DATA_PATHS = {
		profile: "data/profile.json",
		experience: "data/experience.json",
		education: "data/education.json",
		skills: "data/skills.json",
		projects: "data/projects.json",
		gallery: "data/gallery.json",
		blogs: "data/blogs.json"
	};
	var SESSION_KEY = "admin_gh_token";
	var LOCAL_KEY = "admin_gh_token_remember";

	var state = { token: null, branch: "main", sha: {}, data: {} };

	function el(id) { return document.getElementById(id); }
	var authGate = el("auth-gate");
	var workspace = el("admin-workspace");
	var tokenInput = el("token-input");
	var rememberCheckbox = el("remember-token");
	var connectBtn = el("connect-btn");
	var authError = el("auth-error");
	var connectionStatus = el("connection-status");
	var disconnectBtn = el("disconnect-btn");
	var statusBanner = el("status-banner");

	// ---- UTF-8 safe base64 helpers ----
	function utf8ToBase64(str) {
		var bytes = new TextEncoder().encode(str);
		var binary = "";
		bytes.forEach(function (b) { binary += String.fromCharCode(b); });
		return btoa(binary);
	}
	function base64ToUtf8(base64) {
		var binary = atob(base64.replace(/\n/g, ""));
		var bytes = new Uint8Array(binary.length);
		for (var i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
		return new TextDecoder().decode(bytes);
	}

	// ---- GitHub API ----
	function ghHeaders() {
		return {
			Authorization: "Bearer " + state.token,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28"
		};
	}
	function ghGetRepo() {
		return fetch("https://api.github.com/repos/" + CONFIG.owner + "/" + CONFIG.repo, { headers: ghHeaders() })
			.then(function (res) {
				if (!res.ok) { throw new Error("Could not read repository (HTTP " + res.status + ")"); }
				return res.json();
			});
	}
	function ghGetFile(path) {
		return fetch("https://api.github.com/repos/" + CONFIG.owner + "/" + CONFIG.repo + "/contents/" + path + "?ref=" + state.branch, {
			headers: ghHeaders()
		}).then(function (res) {
			if (res.status === 404) { return { sha: null, content: null }; }
			if (!res.ok) { throw new Error("Could not read " + path + " (HTTP " + res.status + ")"); }
			return res.json().then(function (json) {
				return { sha: json.sha, content: base64ToUtf8(json.content) };
			});
		});
	}
	function ghPutFile(path, base64Content, message, sha) {
		var body = { message: message, content: base64Content, branch: state.branch };
		if (sha) { body.sha = sha; }
		var headers = ghHeaders();
		headers["Content-Type"] = "application/json";
		return fetch("https://api.github.com/repos/" + CONFIG.owner + "/" + CONFIG.repo + "/contents/" + path, {
			method: "PUT",
			headers: headers,
			body: JSON.stringify(body)
		}).then(function (res) {
			if (!res.ok) {
				return res.json().catch(function () { return {}; }).then(function (errBody) {
					throw new Error(errBody.message || ("Could not save " + path + " (HTTP " + res.status + ")"));
				});
			}
			return res.json();
		});
	}
	function saveJsonCollection(key) {
		var path = DATA_PATHS[key];
		var pretty = JSON.stringify(state.data[key], null, "\t") + "\n";
		// Re-fetch the current sha right before writing so a save can never race
		// ahead of the initial load (or a change made since), which is what
		// causes GitHub's "sha wasn't supplied" rejection on existing files.
		return ghGetFile(path).then(function (existing) {
			return ghPutFile(path, utf8ToBase64(pretty), "Update " + key + " via admin panel", existing.sha);
		}).then(function (result) {
			state.sha[key] = result.content.sha;
		});
	}
	function fileToBase64(file) {
		return new Promise(function (resolve, reject) {
			var reader = new FileReader();
			reader.onload = function () {
				var result = reader.result;
				resolve(result.substring(result.indexOf(",") + 1));
			};
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}
	function sanitizeFileName(name) {
		return name.trim().toLowerCase().replace(/[^a-z0-9.\-_]/g, "-");
	}
	function uploadImage(file, folder) {
		var path = folder + "/" + sanitizeFileName(file.name);
		return Promise.all([fileToBase64(file), ghGetFile(path)]).then(function (results) {
			var base64 = results[0];
			var existing = results[1];
			return ghPutFile(path, base64, "Upload " + path + " via admin panel", existing.sha).then(function () {
				return path;
			});
		});
	}

	// ---- Status banner ----
	var bannerTimeout;
	function showStatus(message, type) {
		statusBanner.textContent = message;
		statusBanner.className = "status-banner " + type;
		statusBanner.hidden = false;
		clearTimeout(bannerTimeout);
		if (type !== "loading") {
			bannerTimeout = setTimeout(function () { statusBanner.hidden = true; }, 4000);
		}
	}

	// ---- Escaping helpers ----
	function escapeAttr(value) {
		return String(value == null ? "" : value).replace(/"/g, "&quot;");
	}
	function escapeHtml(value) {
		return String(value == null ? "" : value).replace(/[&<>]/g, function (ch) {
			return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch];
		});
	}

	// ---- Auth flow ----
	function connect(token) {
		state.token = token;
		authError.hidden = true;
		connectBtn.disabled = true;
		connectBtn.textContent = "Connecting\u2026";
		return ghGetRepo().then(function (repo) {
			if (!repo.permissions || !repo.permissions.push) {
				throw new Error("This token does not have write access to this repository.");
			}
			state.branch = repo.default_branch || "main";
			connectionStatus.textContent = "Connected \u00b7 " + repo.full_name + " @ " + state.branch;
			connectionStatus.classList.add("connected");
			authGate.hidden = true;
			workspace.hidden = false;
			return loadAllCollections();
		}).catch(function (error) {
			authError.textContent = error.message;
			authError.hidden = false;
			state.token = null;
		}).then(function () {
			connectBtn.disabled = false;
			connectBtn.textContent = "Connect";
		});
	}
	function disconnect() {
		state.token = null;
		state.sha = {};
		state.data = {};
		sessionStorage.removeItem(SESSION_KEY);
		localStorage.removeItem(LOCAL_KEY);
		workspace.hidden = true;
		authGate.hidden = false;
		connectionStatus.textContent = "Not connected";
		connectionStatus.classList.remove("connected");
		tokenInput.value = "";
	}
	connectBtn.addEventListener("click", function () {
		var token = tokenInput.value.trim();
		if (!token) { return; }
		if (rememberCheckbox.checked) {
			localStorage.setItem(LOCAL_KEY, token);
		} else {
			sessionStorage.setItem(SESSION_KEY, token);
		}
		connect(token);
	});
	disconnectBtn.addEventListener("click", disconnect);

	// ---- Nav switching ----
	Array.prototype.forEach.call(document.querySelectorAll(".admin-nav-btn[data-target]"), function (btn) {
		btn.addEventListener("click", function () {
			Array.prototype.forEach.call(document.querySelectorAll(".admin-nav-btn[data-target]"), function (b) { b.classList.remove("active"); });
			Array.prototype.forEach.call(document.querySelectorAll(".admin-panel"), function (p) { p.hidden = true; });
			this.classList.add("active");
			el(this.dataset.target).hidden = false;
		});
	});

	// ---- Load collections ----
	function setWorkspaceInteractive(enabled) {
		Array.prototype.forEach.call(document.querySelectorAll(".save-btn, .add-btn"), function (btn) {
			btn.disabled = !enabled;
		});
	}
	function loadAllCollections() {
		showStatus("Loading content\u2026", "loading");
		setWorkspaceInteractive(false);
		var keys = Object.keys(DATA_PATHS);
		return Promise.all(keys.map(function (key) {
			return ghGetFile(DATA_PATHS[key]).then(function (file) {
				state.sha[key] = file.sha;
				state.data[key] = file.content ? JSON.parse(file.content) : (key === "profile" ? {} : []);
			});
		})).then(function () {
			renderProfile();
			renderTimelineList("experience", el("experience-list"));
			renderTimelineList("education", el("education-list"));
			renderSkillsList();
			renderProjectsList();
			refreshCategoryOptions();
			renderGalleryList();
			renderBlogsList();
			statusBanner.hidden = true;
			setWorkspaceInteractive(true);
		});
	}

	// ---- Profile panel ----
	function renderProfile() {
		var profile = state.data.profile || {};
		el("profile-image-path").value = profile.profileImage || "";
		el("resume-path").value = profile.resumePath || "";
		el("profile-preview").src = "../" + (profile.profileImage || "");
		el("resume-current-link").href = "../" + (profile.resumePath || "");
	}
	el("profile-image-upload").addEventListener("change", function (event) {
		var file = event.target.files[0];
		if (!file) { return; }
		showStatus("Uploading profile photo\u2026", "loading");
		uploadImage(file, "images").then(function (path) {
			el("profile-image-path").value = path;
			el("profile-preview").src = "../" + path;
			showStatus("Photo uploaded. Click Save profile to publish.", "success");
		}).catch(function (error) { showStatus(error.message, "error"); });
	});
	el("resume-upload").addEventListener("change", function (event) {
		var file = event.target.files[0];
		if (!file) { return; }
		showStatus("Uploading resume\u2026", "loading");
		uploadImage(file, "docs").then(function (path) {
			el("resume-path").value = path;
			el("resume-current-link").href = "../" + path;
			showStatus("Resume uploaded. Click Save profile to publish.", "success");
		}).catch(function (error) { showStatus(error.message, "error"); });
	});

	// ---- Experience / Education timelines ----
	function renderTimelineList(key, container) {
		container.innerHTML = "";
		(state.data[key] || []).forEach(function (item, index) {
			var card = document.createElement("div");
			card.className = "entry-card";
			card.innerHTML =
				'<div class="entry-card-header"><span>Entry ' + (index + 1) + '</span><button type="button" class="remove-entry-btn">Remove</button></div>' +
				'<div class="row-2">' +
					'<div class="field"><label>Date range</label><input type="text" data-field="date" value="' + escapeAttr(item.date) + '"></div>' +
					'<div class="field"><label>Title</label><input type="text" data-field="title" value="' + escapeAttr(item.title) + '"></div>' +
				"</div>" +
				'<div class="field"><label>Description</label><textarea data-field="text">' + escapeHtml(item.text) + "</textarea></div>";
			Array.prototype.forEach.call(card.querySelectorAll("[data-field]"), function (input) {
				input.addEventListener("input", function () { item[this.dataset.field] = this.value; });
			});
			card.querySelector(".remove-entry-btn").addEventListener("click", function () {
				state.data[key].splice(index, 1);
				renderTimelineList(key, container);
			});
			container.appendChild(card);
		});
	}

	// ---- Skills ----
	function renderSkillsList() {
		var container = el("skills-list-admin");
		container.innerHTML = "";
		(state.data.skills || []).forEach(function (item, index) {
			var card = document.createElement("div");
			card.className = "entry-card";
			card.innerHTML =
				'<div class="entry-card-header"><span>Skill ' + (index + 1) + '</span><button type="button" class="remove-entry-btn">Remove</button></div>' +
				'<div class="row-2">' +
					'<div class="field"><label>Name</label><input type="text" data-field="name" value="' + escapeAttr(item.name) + '"></div>' +
					'<div class="field"><label>Percent</label><input type="number" min="0" max="100" data-field="percent" value="' + escapeAttr(item.percent) + '"></div>' +
				"</div>";
			Array.prototype.forEach.call(card.querySelectorAll("[data-field]"), function (input) {
				input.addEventListener("input", function () {
					item[this.dataset.field] = this.dataset.field === "percent" ? Number(this.value) : this.value;
				});
			});
			card.querySelector(".remove-entry-btn").addEventListener("click", function () {
				state.data.skills.splice(index, 1);
				renderSkillsList();
			});
			container.appendChild(card);
		});
	}

	// ---- Projects ----
	// A few existing categories keep their original folder names for backward
	// compatibility; any new category the admin types gets its own images/<slug> folder.
	var LEGACY_CATEGORY_FOLDERS = { photography: "images/portfolio", ml: "images/ml", "web-design": "images/webDesign" };
	function projectFolderFor(category) {
		if (LEGACY_CATEGORY_FOLDERS[category]) { return LEGACY_CATEGORY_FOLDERS[category]; }
		var slug = String(category || "misc").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "misc";
		return "images/" + slug;
	}
	function refreshCategoryOptions() {
		var datalist = el("category-options");
		if (!datalist) { return; }
		var seen = [];
		(state.data.projects || []).forEach(function (item) {
			if (item.category && seen.indexOf(item.category) === -1) { seen.push(item.category); }
		});
		seen.sort();
		datalist.innerHTML = seen.map(function (category) {
			return '<option value="' + escapeAttr(category) + '"></option>';
		}).join("");
	}
	function renderProjectsList() {
		var container = el("projects-list");
		container.innerHTML = "";
		(state.data.projects || []).forEach(function (item, index) {
			var card = document.createElement("div");
			card.className = "entry-card";
			card.innerHTML =
				'<div class="entry-card-header"><span>Project ' + (index + 1) + '</span><button type="button" class="remove-entry-btn">Remove</button></div>' +
				'<div class="row-3">' +
					'<div class="field"><label>Category</label><input type="text" list="category-options" data-field="category" value="' + escapeAttr(item.category) + '" placeholder="e.g. portfolio"></div>' +
					'<div class="field"><label>Title</label><input type="text" data-field="title" value="' + escapeAttr(item.title) + '"></div>' +
					'<div class="field"><label>Overlay link (optional)</label><input type="text" data-field="link" value="' + escapeAttr(item.link) + '"></div>' +
				"</div>" +
				'<div class="field"><label>Repository / lightbox link</label><input type="text" data-field="repo" value="' + escapeAttr(item.repo) + '"></div>' +
				'<div class="field"><label>Project image</label><div class="upload-row">' +
					'<img class="thumb-sm" src="../' + escapeAttr(item.image) + '" alt="">' +
					'<input type="file" accept="image/*" class="project-image-upload">' +
				"</div>" +
				'<input type="text" data-field="image" value="' + escapeAttr(item.image) + '"></div>';
			Array.prototype.forEach.call(card.querySelectorAll("[data-field]"), function (input) {
				input.addEventListener("input", function () {
					item[this.dataset.field] = this.value;
					if (this.dataset.field === "image") {
						card.querySelector(".thumb-sm").src = "../" + this.value;
					}
					if (this.dataset.field === "category") {
						refreshCategoryOptions();
					}
				});
			});
			card.querySelector(".project-image-upload").addEventListener("change", function (event) {
				var file = event.target.files[0];
				if (!file) { return; }
				showStatus("Uploading project image\u2026", "loading");
				uploadImage(file, projectFolderFor(item.category)).then(function (path) {
					item.image = path;
					card.querySelector('[data-field="image"]').value = path;
					card.querySelector(".thumb-sm").src = "../" + path;
					showStatus("Image uploaded. Click Save projects to publish.", "success");
				}).catch(function (error) { showStatus(error.message, "error"); });
			});
			card.querySelector(".remove-entry-btn").addEventListener("click", function () {
				state.data.projects.splice(index, 1);
				renderProjectsList();
			});
			container.appendChild(card);
		});
	}

	// ---- Photography gallery ----
	function renderGalleryList() {
		var container = el("gallery-list");
		if (!container) { return; }
		container.innerHTML = "";
		(state.data.gallery || []).forEach(function (path, index) {
			var thumb = document.createElement("div");
			thumb.className = "gallery-thumb";
			thumb.innerHTML =
				'<img src="../' + escapeAttr(path) + '" alt="">' +
				'<button type="button" class="gallery-remove-btn" title="Remove from gallery">\u00d7</button>';
			thumb.querySelector(".gallery-remove-btn").addEventListener("click", function () {
				state.data.gallery.splice(index, 1);
				renderGalleryList();
			});
			container.appendChild(thumb);
		});
	}
	var galleryUploadInput = el("gallery-upload");
	if (galleryUploadInput) {
		galleryUploadInput.addEventListener("change", function (event) {
			var files = Array.prototype.slice.call(event.target.files || []);
			if (!files.length) { return; }
			showStatus("Uploading " + files.length + " photo(s)\u2026", "loading");
			var uploads = files.reduce(function (chain, file) {
				return chain.then(function () {
					return uploadImage(file, "images/portfolio").then(function (path) {
						state.data.gallery = state.data.gallery || [];
						state.data.gallery.push(path);
					});
				});
			}, Promise.resolve());
			uploads.then(function () {
				renderGalleryList();
				galleryUploadInput.value = "";
				showStatus("Photos uploaded. Click Save gallery to publish.", "success");
			}).catch(function (error) {
				showStatus(error.message, "error");
			});
		});
	}

	// ---- Blog posts ----
	function renderBlogsList() {
		var container = el("blogs-list");
		container.innerHTML = "";
		(state.data.blogs || []).forEach(function (item, index) {
			var card = document.createElement("div");
			card.className = "entry-card";
			card.innerHTML =
				'<div class="entry-card-header"><span>Post ' + (index + 1) + (index === 0 ? " (featured)" : "") + '</span><button type="button" class="remove-entry-btn">Remove</button></div>' +
				'<div class="field"><label>Title</label><input type="text" data-field="title" value="' + escapeAttr(item.title) + '"></div>' +
				'<div class="field"><label>Description</label><textarea data-field="description">' + escapeHtml(item.description) + "</textarea></div>" +
				'<div class="row-3">' +
					'<div class="field"><label>Date</label><input type="text" data-field="date" value="' + escapeAttr(item.date) + '"></div>' +
					'<div class="field"><label>Tags (comma separated)</label><input type="text" data-field="tags" value="' + escapeAttr((item.tags || []).join(", ")) + '"></div>' +
					'<div class="field"><label>Link</label><input type="text" data-field="link" value="' + escapeAttr(item.link) + '"></div>' +
				"</div>" +
				'<div class="field"><label>Cover image</label><div class="upload-row">' +
					'<img class="thumb-sm" src="../' + escapeAttr(item.image) + '" alt="">' +
					'<input type="file" accept="image/*" class="blog-image-upload">' +
				"</div>" +
				'<input type="text" data-field="image" value="' + escapeAttr(item.image) + '"></div>';
			Array.prototype.forEach.call(card.querySelectorAll("[data-field]"), function (input) {
				input.addEventListener("input", function () {
					if (this.dataset.field === "tags") {
						item.tags = this.value.split(",").map(function (tag) { return tag.trim(); }).filter(Boolean);
					} else {
						item[this.dataset.field] = this.value;
						if (this.dataset.field === "image") {
							card.querySelector(".thumb-sm").src = "../" + this.value;
						}
					}
				});
			});
			card.querySelector(".blog-image-upload").addEventListener("change", function (event) {
				var file = event.target.files[0];
				if (!file) { return; }
				showStatus("Uploading blog image\u2026", "loading");
				uploadImage(file, "images/blogs").then(function (path) {
					item.image = path;
					card.querySelector('[data-field="image"]').value = path;
					card.querySelector(".thumb-sm").src = "../" + path;
					showStatus("Image uploaded. Click Save blog posts to publish.", "success");
				}).catch(function (error) { showStatus(error.message, "error"); });
			});
			card.querySelector(".remove-entry-btn").addEventListener("click", function () {
				state.data.blogs.splice(index, 1);
				renderBlogsList();
			});
			container.appendChild(card);
		});
	}

	// ---- Add entry buttons ----
	Array.prototype.forEach.call(document.querySelectorAll(".add-btn"), function (btn) {
		btn.addEventListener("click", function () {
			var key = this.dataset.collection;
			if (key === "experience" || key === "education") {
				state.data[key].push({ date: "", title: "", text: "" });
				renderTimelineList(key, el(key + "-list"));
			} else if (key === "skills") {
				state.data.skills.push({ name: "", percent: 50 });
				renderSkillsList();
			} else if (key === "projects") {
				state.data.projects.push({ category: "", title: "", image: "", link: "", repo: "" });
				renderProjectsList();
				refreshCategoryOptions();
			} else if (key === "blogs") {
				state.data.blogs.push({ title: "", description: "", tags: [], date: "", image: "", link: "" });
				renderBlogsList();
			}
		});
	});

	// ---- Save buttons ----
	Array.prototype.forEach.call(document.querySelectorAll(".save-btn"), function (btn) {
		btn.addEventListener("click", function () {
			var key = this.dataset.collection;
			var button = this;
			button.disabled = true;
			showStatus("Saving " + key + "\u2026", "loading");
			if (key === "profile") {
				state.data.profile = {
					profileImage: el("profile-image-path").value.trim(),
					resumePath: el("resume-path").value.trim()
				};
			}
			saveJsonCollection(key).then(function () {
				showStatus("Saved. GitHub Pages will rebuild shortly.", "success");
			}).catch(function (error) {
				showStatus(error.message, "error");
			}).then(function () {
				button.disabled = false;
			});
		});
	});

	// ---- Generic site image uploader ----
	el("site-image-upload").addEventListener("change", function (event) {
		var file = event.target.files[0];
		if (!file) { return; }
		showStatus("Uploading image\u2026", "loading");
		uploadImage(file, "images/site").then(function (path) {
			el("site-image-result").value = path;
			showStatus("Uploaded to " + path, "success");
		}).catch(function (error) { showStatus(error.message, "error"); });
	});

	// ---- Auto-reconnect if a token was remembered / kept for this session ----
	var storedToken = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(LOCAL_KEY);
	if (storedToken) {
		rememberCheckbox.checked = !!localStorage.getItem(LOCAL_KEY);
		tokenInput.value = storedToken;
		connect(storedToken);
	}
})();

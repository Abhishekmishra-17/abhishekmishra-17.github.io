// Hydrates admin-managed content (data/*.json) into the page, falling back
// to the static markup already in index.html when a file can't be loaded.
(function () {
	var dataFiles = {
		profile: "data/profile.json",
		experience: "data/experience.json",
		education: "data/education.json",
		skills: "data/skills.json",
		projects: "data/projects.json",
		blogs: "data/blogs.json"
	};

	function escapeHtml(value) {
		return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
			return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
		});
	}

	function renderTimeline(container, items) {
		if (!container || !items || !items.length) {
			return;
		}
		container.innerHTML = items.map(function (item) {
			return (
				'<div class="timeline-item">' +
					'<div class="circle-dot"></div>' +
					'<h6 class="timeline-date"><i class="fa fa-calendar"></i> ' + escapeHtml(item.date) + "</h6>" +
					'<h4 class="timeline-title">' + escapeHtml(item.title) + "</h4>" +
					'<p class="timeline-text">' + escapeHtml(item.text) + "</p>" +
				"</div>"
			);
		}).join("");
	}

	function renderSkills(container, items) {
		if (!container || !items || !items.length) {
			return;
		}
		container.innerHTML = items.map(function (item) {
			var percent = Number(item.percent) || 0;
			return (
				'<div class="skill-item padd-15">' +
					"<h5>" + escapeHtml(item.name) + "</h5>" +
					'<div class="progress">' +
						'<div class="progress-in" style="width: ' + percent + '%;"></div>' +
						'<div class="skill-percent">' + percent + "%</div>" +
					"</div>" +
				"</div>"
			);
		}).join("");
	}

	function renderProjects(container, items) {
		if (!container || !items || !items.length) {
			return;
		}
		container.innerHTML = items.map(function (item) {
			var icon = item.link
				? '<a href="' + escapeHtml(item.link) + '" target="_blank" aria-label="Open ' + escapeHtml(item.title) + ' project"><i class="fa fa-search" aria-hidden="true"></i></a>'
				: '<i class="fa fa-search" aria-hidden="true"></i>';
			return (
				'<div class="portfolio-item padd-15" data-category="' + escapeHtml(item.category) + '" data-repo="' + escapeHtml(item.repo || "") + '">' +
					'<div class="portfolio-item-inner shadow-dark">' +
						'<div class="portfolio-img"><img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.title) + '"></div>' +
						'<div class="portfolio-info">' +
							"<h4>" + escapeHtml(item.title) + "</h4>" +
							'<div class="icon">' + icon + "</div>" +
						"</div>" +
					"</div>" +
				"</div>"
			);
		}).join("");
	}

	var CATEGORY_LABELS = { "web-design": "Web Design", photography: "Photography", ml: "Machine Learning" };
	function humanizeCategory(slug) {
		if (CATEGORY_LABELS[slug]) {
			return CATEGORY_LABELS[slug];
		}
		return String(slug).replace(/[-_]+/g, " ").replace(/\b\w/g, function (ch) { return ch.toUpperCase(); });
	}

	function renderPortfolioFilters(container, items) {
		if (!container || !items || !items.length) {
			return;
		}
		var categories = [];
		items.forEach(function (item) {
			if (item.category && categories.indexOf(item.category) === -1) {
				categories.push(item.category);
			}
		});
		var buttons = ['<button type="button" class="active" data-filter="all">All</button>'];
		categories.forEach(function (category) {
			buttons.push('<button type="button" data-filter="' + escapeHtml(category) + '">' + escapeHtml(humanizeCategory(category)) + "</button>");
		});
		container.innerHTML = buttons.join("");
	}

	function renderBlogs(container, items) {
		if (!container || !items || !items.length) {
			return;
		}
		container.innerHTML = items.map(function (item) {
			var tags = (item.tags || []).map(function (tag) {
				return "<span>" + escapeHtml(tag) + "</span>";
			}).join(", ");
			return (
				'<div class="blog-item padd-15">' +
					'<div class="blog-item-inner shadow-dark">' +
						'<a href="' + escapeHtml(item.link) + '" target="_blank">' +
							'<div class="blog-img">' +
								'<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.title) + '">' +
								'<div class="blog-date">' + escapeHtml(item.date) + "</div>" +
							"</div>" +
							'<div class="blog-info">' +
								'<h4 class="blog-title">' + escapeHtml(item.title) + "</h4>" +
								'<p class="blog-description">' + escapeHtml(item.description) + "</p>" +
								'<p class="blog-tags">Tags : ' + tags + "</p>" +
							"</div>" +
						"</a>" +
					"</div>" +
				"</div>"
			);
		}).join("");
	}

	function hydrateSite() {
		var keys = Object.keys(dataFiles);
		return Promise.allSettled(
			keys.map(function (key) {
				return fetch(dataFiles[key], { cache: "no-cache" }).then(function (res) {
					if (!res.ok) {
						throw new Error("Failed to load " + dataFiles[key]);
					}
					return res.json();
				});
			})
		).then(function (results) {
			var data = {};
			results.forEach(function (result, index) {
				if (result.status === "fulfilled") {
					data[keys[index]] = result.value;
				}
			});
			window.__siteData = data;

			if (data.profile && data.profile.profileImage) {
				var profileImg = document.getElementById("profile-image");
				if (profileImg) {
					profileImg.setAttribute("src", data.profile.profileImage);
				}
			}
			if (data.profile && data.profile.resumePath) {
				var heroResumeLink = document.getElementById("hero-resume-link");
				if (heroResumeLink) {
					heroResumeLink.setAttribute("href", data.profile.resumePath);
				}
			}
			renderTimeline(document.getElementById("experience-timeline"), data.experience);
			renderTimeline(document.getElementById("education-timeline"), data.education);
			renderSkills(document.getElementById("skills-list"), data.skills);
			renderPortfolioFilters(document.querySelector(".portfolio-filter"), data.projects);
			renderProjects(document.getElementById("portfolio-items"), data.projects);
			renderBlogs(document.getElementById("blog-items"), data.blogs);
		});
	}

	hydrateSite()
		.catch(function (error) {
			console.warn("Content hydration skipped, using static fallback content.", error);
		})
		.then(function () {
			if (typeof window.initSite === "function") {
				window.initSite();
			}
		});
})();

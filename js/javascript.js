window.addEventListener("load",function(){
	const target = window.location.hash && document.querySelector(window.location.hash);
	document.querySelector(".preloader").classList.add("opacity-0");
	setTimeout(function(){
		document.querySelector(".preloader").style.display="none";
		if (target) {
			target.scrollIntoView({ block: "start" });
		}
	},1000)
})

// Subtle interactive glow in the hero that follows the pointer
const heroSection = document.querySelector(".home");
if (heroSection && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
	heroSection.addEventListener("pointermove", function(event) {
		const rect = heroSection.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * 100;
		const y = ((event.clientY - rect.top) / rect.height) * 100;
		heroSection.style.setProperty("--glow-x", x.toFixed(1) + "%");
		heroSection.style.setProperty("--glow-y", y.toFixed(1) + "%");
	});
}

// Soft depth on the header once the page has scrolled
window.addEventListener("scroll", function() {
	document.body.classList.toggle("is-scrolled", window.scrollY > 24);
}, { passive: true });

// Populated by initSite() once admin-managed content has finished loading
let filterContainer, filterBtns, totalFilterBtn, portfolioItems, totalPortfolioItem;
let lightbox, lightboxImg, lightboxText, lightboxCounter, lightboxClose, itemIndex = 0;
let nav, navList, totalNavList, allSection, totalSection;
let navTogglerBtn, aside, contactForm, sendBtn;

// Kept as global function declarations so inline onclick="" handlers in the HTML keep working
function nextItem() {
	itemIndex = itemIndex === totalPortfolioItem - 1 ? 0 : itemIndex + 1;
	changeItem();
}
function prevItem() {
	itemIndex = itemIndex === 0 ? totalPortfolioItem - 1 : itemIndex - 1;
	changeItem();
}
function toggleLightbox() {
	lightbox.classList.toggle("open");
}
function changeItem() {
	const imgSrc = portfolioItems[itemIndex].querySelector(".portfolio-img img").getAttribute("src");
	lightboxImg.src = imgSrc;
	lightboxText.innerHTML = portfolioItems[itemIndex].querySelector("h4").innerHTML;
	lightboxCounter.innerHTML = (itemIndex + 1) + " of " + totalPortfolioItem;
}
function removeBackSectionClass(){
	for (let i = 0; i < totalSection; i++) {
		allSection[i].classList.remove("back-section");
	}
}
function addBackSectionClass(num){
	allSection[num].classList.add("back-section");
}
function showSection(element){
	for (let i = 0; i < totalSection; i++) {
		allSection[i].classList.remove("active");
	}
	const target=element.getAttribute("href").split("#")[1];
	document.querySelector("#"+target).classList.add("active")
}
function updateNav(element){
	for (let i = 0; i < totalNavList; i++) {
		navList[i].querySelector("a").classList.remove("active");
		const target=element.getAttribute("href").split("#")[1];
		if(target=== navList[i].querySelector("a").getAttribute("href").split("#")[1]){
			navList[i].querySelector("a").classList.add("active");
		}
	}
}
function asideSectionTogglerBtn() {
	aside.classList.toggle("open");
	navTogglerBtn.classList.toggle("open");
	for (let i = 0; i < totalSection; i++) {
		allSection[i].classList.toggle("open");
	}
}
function downloadResume(){
	const resumePath = (window.__siteData && window.__siteData.profile && window.__siteData.profile.resumePath) || "./docs/AbhishekMishraResume.pdf";
	const newWindow=window.open(resumePath,"_blank");
	if(newWindow){
		newWindow.focus();
	}
}

// Runs once content.js has hydrated admin-managed sections (or fallen back to static markup)
window.initSite = function initSite() {
	new Typed("#typed",{
		strings:["Python Developer..."],
		typeSpeed:90
	});

	filterContainer=document.querySelector(".portfolio-filter");
	filterBtns=filterContainer.children;
	totalFilterBtn=filterBtns.length;
	portfolioItems=document.querySelectorAll(".portfolio-item");
	totalPortfolioItem=portfolioItems.length;
	for (let i = 0; i < totalFilterBtn; i++) {
		filterBtns[i].addEventListener("click",function() {
			filterContainer.querySelector(".active").classList.remove("active");
			this.classList.add("active");

			const filterValue=this.getAttribute("data-filter");
			for (let k = 0; k < totalPortfolioItem; k++) {
				if(filterValue==="all"||filterValue===portfolioItems[k].getAttribute("data-category")){
					portfolioItems[k].classList.add("show");
					portfolioItems[k].classList.remove("hide");
				}
				else{
					portfolioItems[k].classList.add("hide");
					portfolioItems[k].classList.remove("show");
				}
			}
		})
	}

	lightbox=document.querySelector(".lightbox");
	lightboxImg=lightbox.querySelector(".lightbox-img");
	lightboxText=lightbox.querySelector(".caption-text");
	lightboxCounter=lightbox.querySelector(".caption-counter");
	itemIndex=0;
	for (let i = 0; i < totalPortfolioItem; i++) {
		portfolioItems[i].addEventListener("click",function () {
			itemIndex=i;
			changeItem();
			toggleLightbox();
		})
	}

	lightboxClose=lightbox.querySelector(".lightbox-close");
	lightbox.addEventListener("click",function (event) {
		if(event.target===lightboxClose || event.target===lightbox){
			toggleLightbox();
		}
	})

	document.addEventListener("keydown", function(event) {
		if (!lightbox.classList.contains("open")) {
			return;
		}
		if (event.key === "Escape") {
			toggleLightbox();
		}
		if (event.key === "ArrowRight") {
			nextItem();
		}
		if (event.key === "ArrowLeft") {
			prevItem();
		}
	});

	nav=document.querySelector(".nav");
	navList=nav.querySelectorAll("li");
	totalNavList=navList.length;
	allSection=document.querySelectorAll(".section");
	totalSection=allSection.length;
	for (let i = 0; i < totalNavList; i++) {
		const a=navList[i].querySelector("a");
		a.addEventListener("click",function() {
			removeBackSectionClass();
			for (let j = 0; j < totalNavList; j++) {
				if (navList[j].querySelector("a").classList.contains("active")) {
					addBackSectionClass(j);
				}
				navList[j].querySelector("a").classList.remove("active");
			}
			this.classList.add("active");
			showSection(this);
			if(window.innerWidth < 1200){
				asideSectionTogglerBtn();
			}
		})
	}

	// Keep the nav in sync with whichever section is in view while scrolling
	if ("IntersectionObserver" in window) {
		const sectionObserver = new IntersectionObserver(function(entries) {
			entries.forEach(function(entry) {
				if (!entry.isIntersecting) {
					return;
				}
				const id = entry.target.getAttribute("id");
				navList.forEach(function(item) {
					const link = item.querySelector("a");
					link.classList.toggle("active", link.getAttribute("href") === "#" + id);
				});
			});
		}, { threshold: 0, rootMargin: "-45% 0px -50% 0px" });
		allSection.forEach(function(section) {
			sectionObserver.observe(section);
		});
	}

	navTogglerBtn=document.querySelector(".nav-toggler");
	aside=document.querySelector(".aside");
	navTogglerBtn.addEventListener("click",()=>{
		asideSectionTogglerBtn();
	})

	document.querySelector(".hire-me").addEventListener("click",function() {
		const sectionIndex=this.getAttribute("data-section-index")
		showSection(this);
		updateNav(this);
		removeBackSectionClass();
		addBackSectionClass(sectionIndex)
	})

	contactForm = document.getElementById('contact-form');
	sendBtn = document.getElementById('send-btn');
	sendBtn.addEventListener('click',function(event){
		event.preventDefault();
		const name=encodeURIComponent(document.querySelector('input[name="name"]').value);
		const email=encodeURIComponent(document.querySelector('input[name="email"]').value);
		const subject=encodeURIComponent(document.querySelector('input[name="subject"]').value);
		const message=encodeURIComponent(document.querySelector('textarea[name="message"]').value);
		const mailtoLink = `mailto:akm171216@gmail.com?subject=${subject}&body=${message}%0A%0A%0AThanks,%0A${name}%0A${email}`;
		window.open(mailtoLink,'_blank');
		contactForm.reset()
	})

	document.querySelector('.lightbox-img').addEventListener('click',function(event){
		event.preventDefault();
		const link = portfolioItems[itemIndex] && portfolioItems[itemIndex].dataset.repo;
		if (!link) {
			return;
		}
		const popupwidth=500;
		const popupheight=500;
		const left =window.innerWidth/2-popupwidth/2;
		const top =window.innerHeight/2-popupheight/2;
		const popup=window.open(link,'_blank',`width=${popupwidth},height=${popupheight},left=${left},top=${top}`);
		if (popup) {
			popup.focus();
		}
	});

	// Fade + rise elements into view as the visitor scrolls
	const revealTargets = document.querySelectorAll(
		".section-title, .about-text, .personal-info, .skills, .timeline-box, .portfolio-filter, .portfolio-item, .blog-item, .contact-info-item, .contact-form"
	);
	revealTargets.forEach(function(el) {
		el.classList.add("reveal");
		if (el.classList.contains("portfolio-item") || el.classList.contains("blog-item")) {
			const siblingIndex = Array.prototype.indexOf.call(el.parentElement.children, el);
			el.style.setProperty("--reveal-index", Math.min(siblingIndex, 6));
		}
	});
	if ("IntersectionObserver" in window) {
		const revealObserver = new IntersectionObserver(function(entries, observer) {
			entries.forEach(function(entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add("is-visible");
					observer.unobserve(entry.target);
				}
			});
		}, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
		revealTargets.forEach(function(el) {
			revealObserver.observe(el);
		});
	} else {
		revealTargets.forEach(function(el) {
			el.classList.add("is-visible");
		});
	}
};


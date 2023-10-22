window.addEventListener("load",function(){
	document.querySelector(".preloader").classList.add("opacity-0");
	setTimeout(function(){
		document.querySelector(".preloader").style.display="none";	
	},1000)
})

var typed=new Typed("#typed",{
	strings:["Python Developer..."],
	typeSpeed:90
});

const filterContainer=document.querySelector(".portfolio-filter"),
filterBtns=filterContainer.children,
totalFilterBtn=filterBtns.length,
portfolioItems=document.querySelectorAll(".portfolio-item"),
totalPortfolioItem=portfolioItems.length;
for (let i = 0; i < totalFilterBtn; i++) {
	filterBtns[i].addEventListener("click",function() {
		filterContainer.querySelector(".active").classList.remove("active");
		this.classList.add("active");

		const filterValue=this.getAttribute("data-filter");
		for (var k = 0; k < totalPortfolioItem; k++) {
			if(filterValue==="all"){
				portfolioItems[k].classList.add("show");
				portfolioItems[k].classList.remove("hide");
			}
			else{
				if(filterValue==portfolioItems[k].getAttribute("data-category")){
				portfolioItems[k].classList.add("show");
				portfolioItems[k].classList.remove("hide");
			}
			else{
				portfolioItems[k].classList.add("hide");
				portfolioItems[k].classList.remove("show");
			}
			}
		}
	})
}

const lightbox=document.querySelector(".lightbox"),
lightboxImg=lightbox.querySelector(".lightbox-img"),
lightboxText=lightbox.querySelector(".caption-text"),
lightboxCounter=lightbox.querySelector(".caption-counter");
let itemIndex=0;
for (let i = 0; i < totalPortfolioItem; i++) {
	portfolioItems[i].addEventListener("click",function () {
		itemIndex=i;
		changeItem();
		toggleLightbox();
	})
}

 function nextItem() {
if(itemIndex===totalPortfolioItem-1){
	itemIndex=0;
 }
 else{
 	itemIndex++;
 }
 changeItem();
}
 function prevItem() {
if(itemIndex===0){
	itemIndex=totalPortfolioItem-1;
 }
 else{
 	itemIndex--;
 }
 changeItem();
}
function toggleLightbox() {
	lightbox.classList.toggle("open")
}
function changeItem() {
imgSrc=portfolioItems[itemIndex].querySelector(".portfolio-img img").getAttribute("src");
lightboxImg.src=imgSrc;
lightboxText.innerHTML=portfolioItems[itemIndex].querySelector("h4").innerHTML;
lightboxCounter.innerHTML=(itemIndex+1)+" of "+totalPortfolioItem;
}



const lightboxClose=lightbox.querySelector(".lightbox-close");
lightbox.addEventListener("click",function (event) {
	if(event.target===lightboxClose || event.target===lightbox){
		toggleLightbox();
	}
})



const nav=document.querySelector(".nav"),
navList=nav.querySelectorAll("li"),
totalNavList=navList.length,
allSection=document.querySelectorAll(".section"),
totalSection=allSection.length;
for (let i = 0; i < totalNavList; i++) {
	const a=navList[i].querySelector("a");
	a.addEventListener("click",function() {
		removeBackSectionClass();
		// for (let i = 0; i < totalSection; i++) {
		// allSection[i].classList.remove("back-section");
// }
		for (let j = 0; j < totalNavList; j++) {
			if (navList[j].querySelector("a").classList.contains("active")) {
				// allSection[j].classList.add("back-section");
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
function removeBackSectionClass(){
	for (let i = 0; i < totalSection; i++) {
		allSection[i].classList.remove("back-section");
	}
}
function addBackSectionClass(num){
	allSection[num].classList.add("back-section");
}
function showSection(element){
	// console.log(element);
	for (let i = 0; i < totalSection; i++) {
		allSection[i].classList.remove("active");
	}
	const target=element.getAttribute("href").split("#")[1];
	document.querySelector("#"+target).classList.add("active")
}

const navTogglerBtn=document.querySelector(".nav-toggler"),
aside=document.querySelector(".aside");
navTogglerBtn.addEventListener("click",()=>{
	asideSectionTogglerBtn();
})

function asideSectionTogglerBtn(argument) {
	aside.classList.toggle("open");
	navTogglerBtn.classList.toggle("open");
	for (let i = 0; i < totalSection; i++) {
		allSection[i].classList.toggle("open");
	}
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

document.querySelector(".hire-me").addEventListener("click",function() {
	const sectionIndex=this.getAttribute("data-section-index")
	showSection(this);
	updateNav(this);
	removeBackSectionClass();
	addBackSectionClass(sectionIndex)
})

function downloadResume(){
		const pdfurl="./docs/AbhishekMishraResume.pdf";
		const newWindow=window.open(pdfurl,"_blank");
		if(newWindow){
			newWindow.focus();
		}
}
const contactForm = document.getElementById('contact-form');
const sendBtn = document.getElementById('send-btn');
sendBtn.addEventListener('click',function(event){
	event.preventDefault();
	const name=encodeURIComponent(document.querySelector('input[name="name"]').value);
	const email=encodeURIComponent(document.querySelector('input[name="email"]').value);
	const subject=encodeURIComponent(document.querySelector('input[name="subject"]').value);
	const message=encodeURIComponent(document.querySelector('textarea[name="message"]').value);
	// var body = encodeURIComponent("End Time:" + name + '\n' + "Account:" + email + '\n' + "Description:" + message);
	// console.log(body)
	const mailtoLink = `mailto:akm171216@gmail.com?subject=${subject}&body=${message}%0A%0A%0AThanks,%0A${name}%0A${email}`;
	// const mailtoLink = `mailto:akm171216@gmail.com?subject=${subject}&body={Name=${name} \n Email=${email} \n Message=${message}}`;
	// const mailtoLink=`https://mail.google.com/mail/?view=cm&fs=1&to=Akm171216@gmail.com&su=${subject}&body=Name=${name};\n\tMessage=${message}`;
	// console.log(mailtoLink);
	// window.location.href = mailtoLink;
	window.open(mailtoLink,'_blank');
	contactForm.reset()
	// window.location.href = mailtoLink;
})

// const body =document.querySelector('section');
// const sidebar=270;
// let sidebaropen=false;
// function checksidebaropen(){
// const sidebarselect=document.querySelector('.aside');
// const sidebarRect=sidebarselect.getBoundingClientRect();
// const sidebaropen=sidebarRect.left===0;
// return sidebaropen
// }
// document.addEventListener('mousemove',function(event){
// 	const x =event.pageX-window.pageXOffset;
// 	const y=event.clientY-window.pageYOffset;
// 	const sidebaropen=checksidebaropen();
// 	const effect =document.createElement('div');
// 	effect.className ='special-effect';
// 	if(sidebaropen){
// 		effect.style.left=x-sidebar+'px';
// 	}
// 	else{
// 		effect.style.left=x+'px';
// 	}
// 	effect.style.top =y+'px';
// 	body.appendChild(effect);
// 	setTimeout(function(){
// 				effect.remove();
// 			},300);
// 		});

var hreflist=["https://github.com/Abhishekmishra-17/eb3_Mind-benders_Circular-queue-using-array",
"https://github.com/Abhishekmishra-17/Phenol-formaldehyde-Resin-Urea-formaldehyde-resin",
"imagegrid.html",
"https://github.com/Abhishekmishra-17/eb3_Mind-benders_queue-using-array",
"https://github.com/Abhishekmishra-17/DUDO",
"https://github.com/Abhishekmishra-17/1st-project-accident-control-management-system",
"https://github.com/Abhishekmishra-17/eb3_Mind-Benders_Queue-using-Linked-List",
"https://github.com/Abhishekmishra-17/Stock-market-price-analysis",
"https://github.com/Abhishekmishra-17/Attendance-system-using-face-recognition-onscaling-temperature",
"https://github.com/Abhishekmishra-17/Vehicle-plate-number-detection-using-python",
"https://github.com/Abhishekmishra-17/hand-emojinator-using-python",
"https://github.com/Abhishekmishra-17/-Hindi-Devanagari-Handwriting-recognition-using-python"]
const images =document.querySelector('.lightbox-img')
images.addEventListener('click',function(event){
	event.preventDefault();
	const link =hreflist[itemIndex];
	const popupwidth=500;
	const popupheight=500;
	const left =window.innerWidth/2-popupwidth/2;
	const top =window.innerHeight/2-popupheight/2;
	const  popup=window.open(link,'_blank',`width=${popupwidth},height=${popupheight},left=${left},top=${top}`);
	popup.focus();
	popup.addEventListener('click',function(event){
		event.preventDefault();
		window.open(link,'_blank');
	});

});
$(document).ready(function() {
  const url = window.location.href;
  const parts = url.split("#")[1];
  const active = document.querySelector('.active');
  active.classList.remove('active');
  // Get the element that you want to make active
  const element = document.querySelector('.'+parts);
  // Add the 'active' class to the element
  element.classList.add('active');
//   console.log(parts);
});

---
layout: page
title: Web
permalink: /web/
---

## RABapp.org
RABapp™ provides livestock industry and animal health officials with rapid access to the information they need to respond to animal health emergencies.

![Rabapp-landing]({{ '/assets/images/web-projects-showcase/rabapp-landing-real.png' | relative_url }})
{: .w-100 .full-image}
<video controls class="full-video">
  <source src="{{ '/assets/images/web-projects-showcase/POULTRY_TRIMMED.webm' | relative_url }}" type="video/webm">
  Your browser does not support the video tag.
</video>


![Rabapp-map]({{ '/assets/images/web-projects-showcase/RABAPP-MAP.gif' | relative_url }})
{: .w-100 .full-image}



## Mapping Urban Equity
An interactive web-map made with Leaflet exploring housing and history in Raleigh's neighborhoods.

![Mapping Urban Equity Overview]({{ '/assets/images/web-projects-showcase/mapping-urban-equipty-map-1.png' | relative_url }})

<div class="flex-row" markdown="1">

![Mapping Urban Equity Map View]({{ '/assets/images/web-projects-showcase/mapping-urban-equipty-map-12png.png' | relative_url }})

![Mapping Urban Equity Interactive Demo]({{ '/assets/images/web-projects-showcase/mapping-urban-equity-map-3.gif' | relative_url }})

![Mapping Urban Equity Detail View]({{ '/assets/images/web-projects-showcase/mapping-urban-equity-map-4.png' | relative_url }})

</div>

## ayla-gizlice.com
Portfolio site for multi-media artist Ayla Gizlice. Implements a touch-enabled, side-scrolling photo gallery, interactive project gallery, contact form, and a google spreadsheets based backend that allows Ayla to quickly customize the content without writing any code herself. Hosted with Firebase.

<div class="fill-available">
![Ayla Gizlice Portfolio - Desktop]({{ '/assets/images/web-projects-showcase/ayla-desktop.gif' | relative_url }})
</div>

![Ayla Gizlice Portfolio - Mobile]({{ '/assets/images/web-projects-showcase/ayla-mobile.gif' | relative_url }})


<style>
    .fill-available > p > img{
        width: -webkit-fill-available;
    }
    .full-image > img{
        width: 100%;
    }
    
    .full-video {
        width: 100%;
        max-width: 100%;
        height: auto;
        margin: 1rem 0;
        border-radius: 4px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    /* Flex row for image groups */
    .flex-row {
        display: flex;
        gap: 1rem;
        margin: 1rem 0;
    }
    
    .flex-row img {
        flex: 1;
        min-width: 250px;
        object-fit: cover;
        height: auto;
    }
    
    /* Fade-in animation for all images and videos */
    img, video {
        opacity: 0;
        animation: fadeIn 0.8s ease-in forwards;
        animation-delay: calc(var(--item-index, 0) * 0.1s);
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* Procedurally stagger animations using nth-child */
    img:nth-child(1), video:nth-child(1) { --item-index: 1; }
    img:nth-child(2), video:nth-child(2) { --item-index: 2; }
    img:nth-child(3), video:nth-child(3) { --item-index: 3; }
    img:nth-child(4), video:nth-child(4) { --item-index: 4; }
    img:nth-child(5), video:nth-child(5) { --item-index: 5; }
    img:nth-child(6), video:nth-child(6) { --item-index: 6; }
    img:nth-child(7), video:nth-child(7) { --item-index: 7; }
    img:nth-child(8), video:nth-child(8) { --item-index: 8; }
    img:nth-child(9), video:nth-child(9) { --item-index: 9; }
    img:nth-child(10), video:nth-child(10) { --item-index: 10; }
    img:nth-child(11), video:nth-child(11) { --item-index: 11; }
    img:nth-child(12), video:nth-child(12) { --item-index: 12; }
    img:nth-child(13), video:nth-child(13) { --item-index: 13; }
    img:nth-child(14), video:nth-child(14) { --item-index: 14; }
    img:nth-child(15), video:nth-child(15) { --item-index: 15; }
    img:nth-child(16), video:nth-child(16) { --item-index: 16; }
    img:nth-child(17), video:nth-child(17) { --item-index: 17; }
    img:nth-child(18), video:nth-child(18) { --item-index: 18; }
    img:nth-child(19), video:nth-child(19) { --item-index: 19; }
    img:nth-child(20), video:nth-child(20) { --item-index: 20; }
</style>
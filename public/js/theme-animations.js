/* ============================================================
   theme-animations.js — Cartoon Illustrated Theme Animations
   Bold, visible, playful DOM-based animated elements per theme.
   ============================================================ */

(function initThemeAnimations() {
  'use strict';

  var lastTheme = null;

  function tryInject() {
    var theme = document.documentElement.getAttribute('data-theme') || 'ocean_sunset';
    if (theme === lastTheme) return;
    lastTheme = theme;
    injectAnimations(theme);
  }

  new MutationObserver(tryInject)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  setTimeout(tryInject, 800);
  setTimeout(tryInject, 2000);
  setTimeout(tryInject, 4000);
  document.addEventListener('DOMContentLoaded', function() { setTimeout(tryInject, 500); });

  function injectAnimations(theme) {
    var targets = document.querySelectorAll(
      '.hero-bg, .activities-section, .contact-section'
    );
    if (!targets.length) return;

    targets.forEach(function(el) {
      el.style.position = 'relative';
      el.style.overflow = 'hidden';
      el.querySelectorAll('.theme-anim-layer').forEach(function(old) { old.remove(); });
      
      Array.from(el.children).forEach(function(child) {
        if (!child.classList.contains('theme-anim-layer') && !child.classList.contains('aurora') && !child.classList.contains('hero-stars')) {
          var currentPos = window.getComputedStyle(child).position;
          if (currentPos === 'static') {
            child.style.position = 'relative';
          }
          child.style.zIndex = '2';
        }
      });

      var layer = document.createElement('div');
      layer.className = 'theme-anim-layer';
      layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden;';
      
      if (el.classList.contains('hero-bg')) {
        el.appendChild(layer);
      } else {
        el.insertBefore(layer, el.firstChild);
      }
      
      buildTheme(theme, layer);
    });
  }

  window.refreshThemeAnimations = function() {
    lastTheme = null;
    tryInject();
  };

  function buildTheme(theme, c) {
    var b = {
      ocean_sunset: buildOceanSunset,
      boho_minimalist: buildBohoMinimalist,
      royal_gold: buildRoyalGold,
      glass_ocean: buildGlassOcean,
      mediterranean_azure: buildMediterraneanAzure,
      tropical_canopy: buildTropicalCanopy,
      desert_oasis: buildDesertOasis,
      coastal_pearl: buildCoastalPearl,
      volcanic_ash: buildVolcanicAsh,
      coral_flamingo: buildCoralFlamingo
    };
    if (b[theme]) b[theme](c);
  }

  /* ── 1. OCEAN SUNSET ── */
  function buildOceanSunset(c) {
    // Big cartoon sun
    mk(c, {
      width: '120px', height: '120px', borderRadius: '50%',
      background: 'radial-gradient(circle at 40% 40%, #FFF9C4, #FFE082, #FFB74D)',
      position: 'absolute', top: '5%', right: '10%',
      boxShadow: '0 0 60px 25px rgba(255,183,77,0.5), 0 0 120px 50px rgba(255,183,77,0.2)',
      animation: 'sunBob 5s ease-in-out infinite'
    });
    // Bold layered waves
    [
      { bg: '#FF8A65', op: '0.7', h: '60px', dur: '7s', del: '0s' },
      { bg: '#FF7043', op: '0.8', h: '45px', dur: '5s', del: '-2s' },
      { bg: '#E64A19', op: '0.6', h: '30px', dur: '9s', del: '-4s' }
    ].forEach(function(w) {
      mk(c, {
        position: 'absolute', bottom: '0', left: '-10%',
        width: '120%', height: w.h,
        background: w.bg, opacity: w.op,
        borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
        animation: 'waveRock ' + w.dur + ' ease-in-out ' + w.del + ' infinite alternate'
      });
    });
  }

  /* ── 2. BOHO MINIMALIST ── */
  function buildBohoMinimalist(c) {
    // Big puffy clouds
    for (var i = 0; i < 5; i++) {
      var sz = 80 + Math.random() * 100;
      mk(c, {
        position: 'absolute',
        top: (5 + Math.random() * 35) + '%',
        left: (-25 - i * 12) + '%',
        width: sz + 'px', height: (sz * 0.5) + 'px',
        background: 'rgba(255,255,255,0.85)',
        borderRadius: '60px',
        boxShadow: '0 ' + (sz * 0.18) + 'px 0 rgba(255,255,255,0.6), ' + (sz * 0.25) + 'px ' + (sz * 0.06) + 'px 0 rgba(255,255,255,0.7)',
        animation: 'cloudDrift ' + (20 + i * 7) + 's linear ' + (-i * 5) + 's infinite'
      });
    }
    // Warm sun
    mk(c, {
      width: '90px', height: '90px', borderRadius: '50%',
      background: 'radial-gradient(circle at 40% 40%, #FFF8E1, #F5E0C3, #E8D0B3)',
      position: 'absolute', top: '8%', right: '12%',
      boxShadow: '0 0 50px 20px rgba(232,208,179,0.5)',
      opacity: '0.9'
    });
  }

  /* ── 3. ROYAL GOLD ── */
  function buildRoyalGold(c) {
    for (var i = 0; i < 25; i++) {
      var sz = 6 + Math.random() * 14;
      mk(c, {
        position: 'absolute',
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        width: sz + 'px', height: sz + 'px',
        background: Math.random() > 0.3 ? '#D4AF37' : '#FFD700',
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        transform: 'rotate(45deg)',
        opacity: '0',
        boxShadow: '0 0 10px 4px rgba(212,175,55,0.7)',
        animation: 'sparkleFloat ' + (2 + Math.random() * 3) + 's ease-in-out ' + (-Math.random() * 4) + 's infinite'
      });
    }
  }

  /* ── 4. GLASS OCEAN ── */
  function buildGlassOcean(c) {
    // Bold teal waves
    [
      { bg: 'rgba(0,188,212,0.5)', h: '60px', dur: '6s', del: '0s' },
      { bg: 'rgba(0,150,136,0.45)', h: '45px', dur: '8s', del: '-3s' },
      { bg: 'rgba(38,166,154,0.35)', h: '30px', dur: '10s', del: '-5s' }
    ].forEach(function(w) {
      mk(c, {
        position: 'absolute', bottom: '0', left: '-10%',
        width: '120%', height: w.h,
        background: w.bg,
        borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
        animation: 'waveRock ' + w.dur + ' ease-in-out ' + w.del + ' infinite alternate'
      });
    });
    // 3 big cartoon fish
    var cols = ['#FF7043', '#4DD0E1', '#FFB74D'];
    for (var i = 0; i < 3; i++) {
      var fish = mk(c, {
        position: 'absolute',
        bottom: (8 + i * 12) + '%', right: '-50px',
        width: '40px', height: '22px',
        background: cols[i],
        borderRadius: '50% 20% 20% 50%',
        opacity: '0.85',
        animation: 'fishSwim ' + (7 + i * 3) + 's linear ' + (-i * 2) + 's infinite'
      });
      // tail
      mk(fish, {
        position: 'absolute', right: '-14px', top: '1px',
        width: '0', height: '0',
        borderLeft: '16px solid ' + cols[i],
        borderTop: '10px solid transparent',
        borderBottom: '10px solid transparent'
      });
      // eye
      mk(fish, {
        position: 'absolute', left: '8px', top: '6px',
        width: '6px', height: '6px',
        background: 'white', borderRadius: '50%',
        boxShadow: 'inset 2px 0 0 #333'
      });
    }
  }

  /* ── 5. MEDITERRANEAN AZURE ── */
  function buildMediterraneanAzure(c) {
    // Fluffy clouds
    for (var i = 0; i < 4; i++) {
      var sz = 80 + Math.random() * 70;
      mk(c, {
        position: 'absolute',
        top: (3 + Math.random() * 25) + '%',
        left: (-20 - i * 12) + '%',
        width: sz + 'px', height: (sz * 0.45) + 'px',
        background: 'white', opacity: '0.75',
        borderRadius: '50px',
        boxShadow: (sz * 0.18) + 'px ' + (sz * 0.08) + 'px 0 white, ' + (-sz * 0.12) + 'px ' + (sz * 0.06) + 'px 0 rgba(255,255,255,0.85)',
        animation: 'cloudDrift ' + (22 + i * 8) + 's linear ' + (-i * 6) + 's infinite'
      });
    }
    // Bold seagulls
    for (var i = 0; i < 5; i++) {
      mk(c, {
        position: 'absolute',
        top: (6 + i * 6 + Math.random() * 5) + '%',
        left: '-8%',
        width: '28px', height: '8px',
        borderTop: '4px solid rgba(50,50,50,0.7)',
        borderLeft: '14px solid transparent', borderRight: '14px solid transparent',
        borderRadius: '50% 50% 0 0',
        animation: 'birdFly ' + (10 + i * 4) + 's linear ' + (-i * 3) + 's infinite'
      });
    }
  }

  /* ── 6. TROPICAL CANOPY ── */
  function buildTropicalCanopy(c) {
    var cols = ['#2E7D32', '#4CAF50', '#81C784', '#388E3C', '#66BB6A', '#1B5E20', '#A5D6A7', '#43A047'];
    for (var i = 0; i < 12; i++) {
      var sz = 18 + Math.random() * 28;
      mk(c, {
        position: 'absolute',
        left: Math.random() * 100 + '%', top: '-12%',
        width: sz + 'px', height: (sz * 1.5) + 'px',
        background: cols[i % cols.length],
        borderRadius: '50% 0 50% 0',
        opacity: (0.5 + Math.random() * 0.4).toString(),
        animation: 'leafFall ' + (6 + Math.random() * 7) + 's linear ' + (-Math.random() * 8) + 's infinite'
      });
    }
  }

  /* ── 7. DESERT OASIS ── */
  function buildDesertOasis(c) {
    for (var i = 0; i < 20; i++) {
      var sz = 3 + Math.random() * 8;
      mk(c, {
        position: 'absolute',
        left: Math.random() * 100 + '%',
        bottom: Math.random() * 50 + '%',
        width: sz + 'px', height: sz + 'px',
        background: Math.random() > 0.5 ? '#D4A574' : '#C49A6C', borderRadius: '50%',
        opacity: (0.4 + Math.random() * 0.5).toString(),
        animation: 'sandDrift ' + (4 + Math.random() * 6) + 's ease-in-out ' + (-Math.random() * 4) + 's infinite'
      });
    }
    mk(c, {
      position: 'absolute', bottom: '8%', left: '0', right: '0',
      height: '80px',
      background: 'linear-gradient(transparent, rgba(255,255,255,0.2), transparent)',
      animation: 'heatShimmer 3s ease-in-out infinite'
    });
  }

  /* ── 8. COASTAL PEARL ── */
  function buildCoastalPearl(c) {
    for (var i = 0; i < 15; i++) {
      var sz = 10 + Math.random() * 30;
      mk(c, {
        position: 'absolute',
        left: Math.random() * 100 + '%', bottom: '-12%',
        width: sz + 'px', height: sz + 'px',
        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(200,220,255,0.4))',
        border: '2px solid rgba(255,255,255,0.7)',
        borderRadius: '50%',
        opacity: (0.4 + Math.random() * 0.5).toString(),
        animation: 'bubbleRise ' + (5 + Math.random() * 7) + 's ease-in ' + (-Math.random() * 8) + 's infinite'
      });
    }
  }

  /* ── 9. VOLCANIC ASH ── */
  function buildVolcanicAsh(c) {
    for (var i = 0; i < 20; i++) {
      var sz = 4 + Math.random() * 10;
      var col = Math.random() > 0.4 ? '#FF5722' : '#FF9800';
      mk(c, {
        position: 'absolute',
        left: Math.random() * 100 + '%', bottom: '-5%',
        width: sz + 'px', height: sz + 'px',
        background: col, borderRadius: '50%',
        boxShadow: '0 0 ' + (sz * 2) + 'px ' + col,
        opacity: (0.5 + Math.random() * 0.5).toString(),
        animation: 'emberRise ' + (3 + Math.random() * 5) + 's ease-out ' + (-Math.random() * 4) + 's infinite'
      });
    }
    mk(c, {
      position: 'absolute', bottom: '0', left: '0', right: '0',
      height: '8px',
      background: 'linear-gradient(90deg, #EF4444, #FF9800, #EF4444, #FF5722, #EF4444)',
      backgroundSize: '200% 100%',
      boxShadow: '0 0 40px 15px rgba(239,68,68,0.5), 0 0 80px 30px rgba(255,152,0,0.25)',
      animation: 'lavaGlow 3s linear infinite'
    });
  }

  /* ── 10. CORAL FLAMINGO ── */
  function buildCoralFlamingo(c) {
    // High contrast fish colors so they don't blend into the pink background!
    var cols = ['#FFFFFF', '#FEF08A', '#A7F3D0', '#E0F2FE', '#FDE047'];
    for (var i = 0; i < 5; i++) {
      var fish = mk(c, {
        position: 'absolute',
        top: (15 + i * 15) + '%', right: '-50px',
        width: '45px', height: '24px',
        background: cols[i],
        borderRadius: '50% 20% 20% 50%',
        opacity: '0.9',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        animation: 'fishSwim ' + (8 + i * 3) + 's linear ' + (-i * 2) + 's infinite'
      });
      mk(fish, {
        position: 'absolute', right: '-14px', top: '1px',
        width: '0', height: '0',
        borderLeft: '16px solid ' + cols[i],
        borderTop: '11px solid transparent',
        borderBottom: '11px solid transparent'
      });
      mk(fish, {
        position: 'absolute', left: '8px', top: '6px',
        width: '6px', height: '6px',
        background: '#1A1A1A', borderRadius: '50%',
        boxShadow: 'inset 2px 0 0 #FFFFFF'
      });
    }
    for (var i = 0; i < 15; i++) {
      var sz = 8 + Math.random() * 20;
      mk(c, {
        position: 'absolute',
        left: Math.random() * 100 + '%', bottom: '-15%',
        width: sz + 'px', height: sz + 'px',
        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.4))',
        border: '1px solid rgba(255,255,255,0.9)',
        borderRadius: '50%',
        opacity: (0.7 + Math.random() * 0.3).toString(),
        animation: 'bubbleRise ' + (4 + Math.random() * 5) + 's ease-in ' + (-Math.random() * 6) + 's infinite'
      });
    }
  }

  /* ── Helper ── */
  function mk(parent, styles) {
    var d = document.createElement('div');
    Object.assign(d.style, styles);
    parent.appendChild(d);
    return d;
  }

  /* ── Keyframes ── */
  var s = document.createElement('style');
  s.textContent = [
    '@keyframes sunBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-15px)}}',
    '@keyframes waveRock{0%{transform:translateX(-3%) scaleY(1)}50%{transform:translateX(3%) scaleY(1.2)}100%{transform:translateX(-3%) scaleY(1)}}',
    '@keyframes cloudDrift{0%{transform:translateX(0)}100%{transform:translateX(calc(100vw + 100%))}}',
    '@keyframes sparkleFloat{0%{opacity:0;transform:rotate(45deg) translateY(0) scale(.3)}15%{opacity:1;transform:rotate(45deg) translateY(-8px) scale(1.3)}35%{opacity:0;transform:rotate(45deg) translateY(-20px) scale(.5)}100%{opacity:0;transform:rotate(45deg) translateY(-30px) scale(.3)}}',
    '@keyframes fishSwim{0%{transform:translateX(0) scaleX(-1)}100%{transform:translateX(calc(-100vw - 80px)) scaleX(-1)}}',
    '@keyframes birdFly{0%{transform:translateX(0)}100%{transform:translateX(calc(100vw + 60px))}}',
    '@keyframes leafFall{0%{transform:translateY(0) rotate(0) translateX(0);opacity:0}8%{opacity:.7}85%{opacity:.5}100%{transform:translateY(calc(100vh + 60px)) rotate(720deg) translateX(60px);opacity:0}}',
    '@keyframes sandDrift{0%{transform:translate(0,0);opacity:.4}50%{transform:translate(40px,-50px);opacity:.7}100%{transform:translate(80px,0);opacity:0}}',
    '@keyframes heatShimmer{0%,100%{transform:scaleY(1) translateY(0);opacity:.3}50%{transform:scaleY(1.8) translateY(-15px);opacity:.6}}',
    '@keyframes bubbleRise{0%{transform:translateY(0) scale(.4);opacity:0}8%{opacity:.7}75%{opacity:.5}100%{transform:translateY(calc(-100vh - 60px)) scale(1.1);opacity:0}}',
    '@keyframes emberRise{0%{transform:translateY(0) scale(1);opacity:.9}50%{transform:translateY(calc(-50vh)) translateX(25px) scale(.7);opacity:.6}100%{transform:translateY(calc(-100vh)) scale(.2);opacity:0}}',
    '@keyframes lavaGlow{0%{background-position:0% 50%}100%{background-position:200% 50%}}'
  ].join('\n');
  document.head.appendChild(s);
})();

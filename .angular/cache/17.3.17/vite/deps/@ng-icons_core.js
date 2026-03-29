import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Inject,
  InjectionToken,
  Injector,
  Input,
  InputFlags,
  NgModule,
  Optional,
  SkipSelf,
  booleanAttribute,
  inject,
  makeEnvironmentProviders,
  numberAttribute,
  runInInjectionContext,
  setClassMetadata,
  ɵɵInputTransformsFeature,
  ɵɵNgOnChangesFeature,
  ɵɵStandaloneFeature,
  ɵɵclassMap,
  ɵɵdefineComponent,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵhostProperty,
  ɵɵinject,
  ɵɵstyleProp
} from "./chunk-3NY34RAC.js";
import {
  firstValueFrom,
  isObservable
} from "./chunk-6O77X5R6.js";
import "./chunk-ITNSOF2D.js";
import "./chunk-7DGIAWOM.js";
import {
  __async,
  __spreadValues
} from "./chunk-WDMUDEB6.js";

// node_modules/@ng-icons/core/fesm2022/ng-icons-core.mjs
var NgGlyphConfigToken = new InjectionToken("Ng Glyph Config");
var defaultConfig$1 = {
  size: "1em",
  opticalSize: 20,
  weight: 400,
  grade: 0,
  fill: false
};
function provideNgGlyphsConfig(config) {
  return {
    provide: NgGlyphConfigToken,
    useValue: __spreadValues(__spreadValues({}, defaultConfig$1), config)
  };
}
function injectNgGlyphsConfig() {
  return inject(NgGlyphConfigToken, {
    optional: true
  }) ?? defaultConfig$1;
}
var NgGlyphsToken = new InjectionToken("NgGlyphsToken");
function provideNgGlyphs(...glyphsets) {
  if (!glyphsets.length) {
    throw new Error("Please provide at least one glyphset.");
  }
  const defaultGlyphset = glyphsets[0].name;
  return makeEnvironmentProviders([{
    provide: NgGlyphsToken,
    useValue: {
      defaultGlyphset,
      glyphsets
    }
  }]);
}
function injectNgGlyphs() {
  const glyphs = inject(NgGlyphsToken, {
    optional: true
  });
  if (!glyphs) {
    throw new Error("Please provide the glyphs using the provideNgGlyphs() function.");
  }
  return glyphs;
}
function coerceCssPixelValue(value) {
  return value == null ? "" : /^\d+$/.test(value) ? `${value}px` : value;
}
var NgGlyph = class _NgGlyph {
  constructor() {
    this.glyphsets = injectNgGlyphs();
    this.config = injectNgGlyphsConfig();
    this.glyphset = this.glyphsets.defaultGlyphset;
    this.opticalSize = this.config.opticalSize;
    this.weight = this.config.weight;
    this.grade = this.config.grade;
    this.fill = this.config.fill;
    this.size = this.config.size;
    this.color = this.config.color;
  }
  /**
   * Derive the glyphset class from the glyphset name
   */
  get glyphsetClass() {
    const glyphset = this.glyphsets.glyphsets.find((glyphset2) => glyphset2.name === this.glyphset);
    if (!glyphset) {
      throw new Error(`The glyphset "${this.glyphset}" does not exist. Please provide a valid glyphset.`);
    }
    return glyphset.baseClass;
  }
  /**
   * Define the font variation settings of the glyph
   */
  get fontVariationSettings() {
    return `'FILL' ${this.fill ? 1 : 0}, 'wght' ${this.weight}, 'GRAD' ${this.grade}, 'opsz' ${this.opticalSize}`;
  }
  static {
    this.ɵfac = function NgGlyph_Factory(t) {
      return new (t || _NgGlyph)();
    };
  }
  static {
    this.ɵcmp = ɵɵdefineComponent({
      type: _NgGlyph,
      selectors: [["ng-glyph"]],
      hostVars: 9,
      hostBindings: function NgGlyph_HostBindings(rf, ctx) {
        if (rf & 2) {
          ɵɵhostProperty("textContent", ctx.name);
          ɵɵclassMap(ctx.glyphsetClass);
          ɵɵstyleProp("--ng-glyph__size", ctx.size)("color", ctx.color)("font-variation-settings", ctx.fontVariationSettings);
        }
      },
      inputs: {
        name: "name",
        glyphset: "glyphset",
        opticalSize: [InputFlags.HasDecoratorInputTransform, "opticalSize", "opticalSize", numberAttribute],
        weight: [InputFlags.HasDecoratorInputTransform, "weight", "weight", numberAttribute],
        grade: [InputFlags.HasDecoratorInputTransform, "grade", "grade", numberAttribute],
        fill: [InputFlags.HasDecoratorInputTransform, "fill", "fill", booleanAttribute],
        size: [InputFlags.HasDecoratorInputTransform, "size", "size", coerceCssPixelValue],
        color: "color"
      },
      standalone: true,
      features: [ɵɵInputTransformsFeature, ɵɵStandaloneFeature],
      decls: 0,
      vars: 0,
      template: function NgGlyph_Template(rf, ctx) {
      },
      styles: ["[_nghost-%COMP%]{display:inline-block;width:var(--ng-glyph__size);height:var(--ng-glyph__size);font-size:var(--ng-glyph__size);overflow:hidden}"],
      changeDetection: 0
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgGlyph, [{
    type: Component,
    args: [{
      selector: "ng-glyph",
      standalone: true,
      template: ``,
      changeDetection: ChangeDetectionStrategy.OnPush,
      styles: [":host{display:inline-block;width:var(--ng-glyph__size);height:var(--ng-glyph__size);font-size:var(--ng-glyph__size);overflow:hidden}\n"]
    }]
  }], null, {
    name: [{
      type: HostBinding,
      args: ["textContent"]
    }, {
      type: Input,
      args: [{
        required: true
      }]
    }],
    glyphset: [{
      type: Input
    }],
    opticalSize: [{
      type: Input,
      args: [{
        transform: numberAttribute
      }]
    }],
    weight: [{
      type: Input,
      args: [{
        transform: numberAttribute
      }]
    }],
    grade: [{
      type: Input,
      args: [{
        transform: numberAttribute
      }]
    }],
    fill: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    size: [{
      type: HostBinding,
      args: ["style.--ng-glyph__size"]
    }, {
      type: Input,
      args: [{
        transform: coerceCssPixelValue
      }]
    }],
    color: [{
      type: HostBinding,
      args: ["style.color"]
    }, {
      type: Input
    }],
    glyphsetClass: [{
      type: HostBinding,
      args: ["class"]
    }],
    fontVariationSettings: [{
      type: HostBinding,
      args: ["style.font-variation-settings"]
    }]
  });
})();
function createFeature(kind, providers) {
  return {
    ɵkind: kind,
    ɵproviders: providers
  };
}
var NgIconPreProcessorToken = new InjectionToken("Ng Icon Pre Processor");
var NgIconPostProcessorToken = new InjectionToken("Ng Icon Post Processor");
function injectNgIconPreProcessor() {
  return inject(NgIconPreProcessorToken, {
    optional: true
  }) ?? ((icon) => icon);
}
function injectNgIconPostProcessor() {
  return inject(NgIconPostProcessorToken, {
    optional: true
  }) ?? (() => {
  });
}
function preprocessIcon(icon) {
  return icon.replace(/style\s*=/g, "data-style=");
}
function postprocessIcon(element) {
  const elements = element.querySelectorAll("[data-style]");
  for (const element2 of Array.from(elements)) {
    const styles = element2.getAttribute("data-style");
    styles?.split(";").forEach((style) => {
      const [property, value] = style.split(":");
      element2.style[property.trim()] = value.trim();
    });
    element2.removeAttribute("data-style");
  }
}
function withContentSecurityPolicy() {
  return createFeature(0, [{
    provide: NgIconPreProcessorToken,
    useValue: preprocessIcon
  }, {
    provide: NgIconPostProcessorToken,
    useValue: postprocessIcon
  }]);
}
var NgIconConfigToken = new InjectionToken("Ng Icon Config");
var defaultConfig = {
  size: "1em"
};
function provideNgIconsConfig(config, ...features) {
  return [{
    provide: NgIconConfigToken,
    useValue: __spreadValues(__spreadValues({}, defaultConfig), config)
  }, features.map((feature) => feature.ɵproviders)];
}
function injectNgIconConfig() {
  return inject(NgIconConfigToken, {
    optional: true
  }) ?? defaultConfig;
}
var NgIconLoaderToken = new InjectionToken("Ng Icon Loader Token");
function loaderFeature(kind, providers) {
  return {
    kind,
    providers
  };
}
var NgIconCacheToken = new InjectionToken("Ng Icon Cache Token");
function withCaching() {
  return loaderFeature(0, [{
    provide: NgIconCacheToken,
    useValue: /* @__PURE__ */ new Map()
  }]);
}
function provideNgIconLoader(loader, ...features) {
  return [{
    provide: NgIconLoaderToken,
    useValue: loader
  }, features.map((feature) => feature.providers)];
}
function injectNgIconLoader() {
  return inject(NgIconLoaderToken, {
    optional: true
  });
}
function injectNgIconLoaderCache() {
  return inject(NgIconCacheToken, {
    optional: true
  });
}
function provideIcons(icons) {
  return [{
    provide: NgIconsToken,
    useFactory: (parentIcons) => __spreadValues(__spreadValues({}, parentIcons?.reduce((acc, icons2) => __spreadValues(__spreadValues({}, acc), icons2), {})), icons),
    deps: [[NgIconsToken, new Optional(), new SkipSelf()]],
    multi: true
  }];
}
var NgIconsToken = new InjectionToken("Icons Token");
function injectNgIcons() {
  return inject(NgIconsToken, {
    optional: true
  }) ?? [];
}
function coerceLoaderResult(result) {
  if (typeof result === "string") {
    return Promise.resolve(result);
  }
  if (isObservable(result)) {
    return firstValueFrom(result);
  }
  return result;
}
function toPropertyName(str) {
  return str.replace(/([^a-zA-Z0-9])+(.)?/g, (_, __, chr) => chr ? chr.toUpperCase() : "").replace(/[^a-zA-Z\d]/g, "").replace(/^([A-Z])/, (m) => m.toLowerCase());
}
var LoggerToken = new InjectionToken("Ng Icon Logger");
var DefaultLogger = class {
  log(message) {
    console.log(message);
  }
  warn(message) {
    console.warn(message);
  }
  error(message) {
    console.error(message);
  }
};
var ExceptionLogger = class {
  log(message) {
    console.log(message);
  }
  warn(message) {
    throw new Error(message);
  }
  error(message) {
    throw new Error(message);
  }
};
function injectLogger() {
  return inject(LoggerToken, {
    optional: true
  }) ?? new DefaultLogger();
}
function withExceptionLogger() {
  return createFeature(1, [{
    provide: LoggerToken,
    useClass: ExceptionLogger
  }]);
}
var NgIcon = class _NgIcon {
  constructor() {
    this.config = injectNgIconConfig();
    this.icons = injectNgIcons();
    this.loader = injectNgIconLoader();
    this.cache = injectNgIconLoaderCache();
    this.preProcessor = injectNgIconPreProcessor();
    this.postProcessor = injectNgIconPostProcessor();
    this.injector = inject(Injector);
    this.elementRef = inject(ElementRef);
    this.logger = injectLogger();
    this.size = this.config.size;
    this.color = this.config.color;
  }
  /** Define the name of the icon to display */
  set name(name) {
    this.setIcon(name);
  }
  /** Define the svg of the icon to display */
  set svg(svg) {
    this.setSvg(svg);
  }
  ngOnChanges(changes) {
    if (changes.size) {
      this.setIconSize();
    }
    if (changes.color) {
      this.setIconColor();
    }
    if (changes.strokeWidth) {
      this.setIconStrokeWidth();
    }
  }
  ngOnInit() {
    this.setIconStyles();
  }
  setIconColor() {
    this.elementRef.nativeElement.style.removeProperty("color");
    if (this.color !== void 0) {
      this.elementRef.nativeElement.style.setProperty("color", this.color);
    }
  }
  setIconSize() {
    this.elementRef.nativeElement.style.removeProperty("--ng-icon__size");
    if (this.size !== void 0) {
      this.elementRef.nativeElement.style.setProperty("--ng-icon__size", this.size.toString());
    }
  }
  setIconStrokeWidth() {
    this.elementRef.nativeElement.style.removeProperty("--ng-icon__stroke-width");
    if (this.strokeWidth !== void 0) {
      this.elementRef.nativeElement.style.setProperty("--ng-icon__stroke-width", this.strokeWidth.toString());
    }
  }
  /**
   * Set the styles for the icon. We use the style property to set the styles
   * rather than the host binding as it works with CSP.
   */
  setIconStyles() {
    this.setIconColor();
    this.setIconSize();
    this.setIconStrokeWidth();
  }
  setSvg(svg) {
    this.elementRef.nativeElement.innerHTML = this.preProcessor(svg);
    this.postProcessor(this.elementRef.nativeElement);
  }
  /**
   * Load the icon with the given name and insert it into the template.
   * @param name The name of the icon to load.
   */
  setIcon(name) {
    return __async(this, null, function* () {
      const propertyName = toPropertyName(name);
      for (const icons of [...this.icons].reverse()) {
        if (icons[propertyName]) {
          this.setSvg(icons[propertyName]);
          return;
        }
      }
      if (this.loader) {
        const result = yield this.requestIconFromLoader(name);
        if (result !== null) {
          this.setSvg(result);
          return;
        }
      }
      this.logger.warn(`No icon named ${name} was found. You may need to import it using the withIcons function.`);
    });
  }
  /**
   * Request the icon from the loader.
   * @param name The name of the icon to load.
   * @returns The SVG content for a given icon name.
   */
  requestIconFromLoader(name) {
    return new Promise((resolve) => {
      runInInjectionContext(this.injector, () => __async(this, null, function* () {
        if (this.cache) {
          const cachedResult = this.cache.get(name);
          if (typeof cachedResult === "string") {
            resolve(cachedResult);
            return;
          }
          if (cachedResult instanceof Promise) {
            const result2 = yield cachedResult;
            resolve(result2);
            return;
          }
        }
        const promise = coerceLoaderResult(this.loader(name));
        this.cache?.set(name, promise);
        const result = yield promise;
        this.cache?.set(name, result);
        resolve(result);
      }));
    });
  }
  static {
    this.ɵfac = function NgIcon_Factory(t) {
      return new (t || _NgIcon)();
    };
  }
  static {
    this.ɵcmp = ɵɵdefineComponent({
      type: _NgIcon,
      selectors: [["ng-icon"]],
      inputs: {
        name: "name",
        svg: "svg",
        size: [InputFlags.HasDecoratorInputTransform, "size", "size", coerceCssPixelValue],
        strokeWidth: "strokeWidth",
        color: "color"
      },
      standalone: true,
      features: [ɵɵInputTransformsFeature, ɵɵNgOnChangesFeature, ɵɵStandaloneFeature],
      decls: 0,
      vars: 0,
      template: function NgIcon_Template(rf, ctx) {
      },
      styles: ["[_nghost-%COMP%]{display:inline-block;width:var(--ng-icon__size);height:var(--ng-icon__size);overflow:hidden}"],
      changeDetection: 0
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgIcon, [{
    type: Component,
    args: [{
      selector: "ng-icon",
      template: "",
      standalone: true,
      changeDetection: ChangeDetectionStrategy.OnPush,
      styles: [":host{display:inline-block;width:var(--ng-icon__size);height:var(--ng-icon__size);overflow:hidden}\n"]
    }]
  }], null, {
    name: [{
      type: Input
    }],
    svg: [{
      type: Input
    }],
    size: [{
      type: Input,
      args: [{
        transform: coerceCssPixelValue
      }]
    }],
    strokeWidth: [{
      type: Input
    }],
    color: [{
      type: Input
    }]
  });
})();
var NgIconsModule = class _NgIconsModule {
  constructor(icons) {
    if (Object.keys(icons).length === 0) {
      throw new Error("No icons have been provided. Ensure to include some icons by importing them using NgIconsModule.withIcons({ ... }).");
    }
  }
  /**
   * Define the icons that will be included in the application. This allows unused icons to
   * be tree-shaken away to reduce bundle size
   * @param icons The object containing the required icons
   */
  static withIcons(icons) {
    return {
      ngModule: _NgIconsModule,
      providers: provideIcons(icons)
    };
  }
  static {
    this.ɵfac = function NgIconsModule_Factory(t) {
      return new (t || _NgIconsModule)(ɵɵinject(NgIconsToken));
    };
  }
  static {
    this.ɵmod = ɵɵdefineNgModule({
      type: _NgIconsModule,
      imports: [NgIcon],
      exports: [NgIcon]
    });
  }
  static {
    this.ɵinj = ɵɵdefineInjector({});
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgIconsModule, [{
    type: NgModule,
    args: [{
      imports: [NgIcon],
      exports: [NgIcon]
    }]
  }], () => [{
    type: void 0,
    decorators: [{
      type: Inject,
      args: [NgIconsToken]
    }]
  }], null);
})();
var NG_ICON_DIRECTIVES = [NgIcon];
export {
  NG_ICON_DIRECTIVES,
  NgGlyph,
  NgGlyphConfigToken,
  NgIcon,
  NgIconCacheToken,
  NgIcon as NgIconComponent,
  NgIconConfigToken,
  NgIconLoaderToken,
  NgIconsModule,
  NgIconsToken,
  injectNgGlyphsConfig,
  injectNgIconConfig,
  injectNgIconLoader,
  injectNgIconLoaderCache,
  injectNgIcons,
  provideIcons,
  provideNgGlyphs,
  provideNgGlyphsConfig,
  provideNgIconLoader,
  provideNgIconsConfig,
  withCaching,
  withContentSecurityPolicy,
  withExceptionLogger
};
//# sourceMappingURL=@ng-icons_core.js.map

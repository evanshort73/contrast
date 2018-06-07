// https://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast-contrast.html#contrast-ratiodef
function rgbContrastRatio(color1, color2) {
  let l1 = rgbRelativeLuminance(color1);
  let l2 = rgbRelativeLuminance(color2);
  if (l2 > l1) {
    return (l2 + 0.05) / (l1 + 0.05);
  } else {
    return (l1 + 0.05) / (l2 + 0.05);
  }
}

// https://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
function rgbRelativeLuminance(color) {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

function bytesToHex(c) {
  if (c == null) {
    return "transparent";
  }

  return "#" + byteToHex(c.r) + byteToHex(c.g) + byteToHex(c.b);
}

function byteToHex(channel) {
  let unpadded = channel.toString(16);
  if (unpadded.length == 1) {
    return "0" + unpadded;
  } else {
    return unpadded;
  }
}

function hexToBytes(color) {
  return {
    r: parseInt(color.substring(1, 3), 16),
    g: parseInt(color.substring(3, 5), 16),
    b: parseInt(color.substring(5, 7), 16)
  };
}

function bytesToSrgb(color) {
  return mapChannels(byteChannelToSrgb, color);
}

function byteChannelToSrgb(channel) {
  return channel / 255;
}

function srgbToBytes(color) {
  let c = mapChannels(srgbChannelToByte, color);
  if (c.r == null || c.g == null || c.b == null) {
    return null;
  }

  return c;
}

function srgbChannelToByte(channel) {
  let b = Math.round(channel * 255);
  if (b < 0 || b > 255) {
    return null;
  }

  return b;
}

// https://en.wikipedia.org/wiki/SRGB#Specification_of_the_transformation
function srgbToRgb(color) {
  return mapChannels(srgbChannelToRgb, color);
}

function srgbChannelToRgb(channel) {
   if (channel <= 0.03928) {
    return channel / 12.92;
  } else {
    return Math.pow((channel + 0.055) / 1.055, 2.4);
  }
}

// https://www.w3.org/Graphics/Color/sRGB.html
function rgbToSrgb(color) {
  return mapChannels(rgbChannelToSrgb, color);
}

function rgbChannelToSrgb(channel) {
   if (channel <= 0.00304) {
    return 12.92 * channel;
  } else {
    return 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
  }
}

function mapChannels(f, color) {
  return {
    r: f(color.r),
    g: f(color.g),
    b: f(color.b)
  };
}

// https://en.wikipedia.org/wiki/SRGB#The_forward_transformation_(CIE_XYZ_to_sRGB)
function xyzToRgb(c) {
  return {
    r: 3.2406 * c.x - 1.5372 * c.y - 0.4986 * c.z,
    g: -0.9689 * c.x + 1.8758 * c.y + 0.0415 * c.z,
    b: 0.0557 * c.x - 0.2040 * c.y + 1.0570 * c.z
  };
}

// https://en.wikipedia.org/wiki/SRGB#The_reverse_transformation
function rgbToXyz(c) {
  return {
    x: 0.4124 * c.r + 0.3576 * c.g + 0.1805 * c.b,
    y: 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b,
    z: 0.0193 * c.r + 0.1192 * c.g + 0.9505 * c.b
  };
}

// https://en.wikipedia.org/wiki/CIELAB_color_space#Forward_transformation
function xyzToLab(illuminant, color) {
  let fx = labFunction(color.x / illuminant.x);
  let fy = labFunction(color.y / illuminant.y);
  let fz = labFunction(color.z / illuminant.z);
  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  };
}

function labFunction(t) {
  let delta = 6 / 29;
  if (t > Math.pow(delta, 3)) {
    return Math.pow(t, 1 / 3);
  } else {
    return t / (3 * delta * delta) + 4 / 29;
  }
}

https://en.wikipedia.org/wiki/CIELAB_color_space#Reverse_transformation
function labToXyz(illuminant, color) {
  let fy = (color.l + 16) / 116;
  return {
    x: illuminant.x * inverseLabFunction(fy + color.a / 500),
    y: illuminant.y * inverseLabFunction(fy),
    z: illuminant.z * inverseLabFunction(fy - color.b / 200)
  };
}

function inverseLabFunction(t) {
  let delta = 6 / 29;
  if (t > delta) {
    return Math.pow(t, 3);
  } else {
    return 3 * delta * delta * (t - 4 / 29);
  }
}

var illuminantD65 = {
  x: 0.95047,
  y: 1,
  z: 1.08883
};

function hexToLab(color) {
  return xyzToLab(illuminantD65, rgbToXyz(srgbToRgb(bytesToSrgb(hexToBytes(color)))));
}

function labToHex(color) {
  return bytesToHex(srgbToBytes(rgbToSrgb(xyzToRgb(labToXyz(illuminantD65, color)))));
}

function labToRgb(color) {
  return xyzToRgb(labToXyz(illuminantD65, color));
}

function labToBytes(color) {
  return srgbToBytes(rgbToSrgb(xyzToRgb(labToXyz(illuminantD65, color))));
}

function saturate(high, aScale, lightness, slope, rgbForeground, contrast, angle) {
  let low = 0;
  let best = null;
  let tolerance = 0.0001;
  let x = Math.cos(angle) / aScale;
  let y = Math.sin(angle)
  while (high - low > tolerance) {
    let mid = 0.5 * (high + low);
    let a = 256 * x * mid;
    let rgb = labToRgb(
      {
        l: lightness + slope * a,
        a: a,
        b: 256 * y * mid
      }
    );
    if (rgbContrastRatio(rgb, rgbForeground) < contrast) {
      high = mid;
    } else {
      let b = srgbToBytes(rgbToSrgb(rgb));
      if (b == null) {
        high = mid;
      } else {
        best = b;
        low = mid;
      }
    }
  }
  return best;
}

(function () {
  "use strict";

  var capacities = {
    1: { data: 16, blocks: [{ count: 1, data: 16, ecc: 10 }], align: [] },
    2: { data: 28, blocks: [{ count: 1, data: 28, ecc: 16 }], align: [6, 18] },
    3: { data: 44, blocks: [{ count: 1, data: 44, ecc: 26 }], align: [6, 22] },
    4: { data: 64, blocks: [{ count: 2, data: 32, ecc: 18 }], align: [6, 26] },
    5: { data: 86, blocks: [{ count: 2, data: 43, ecc: 24 }], align: [6, 30] }
  };

  var expTable = new Array(512);
  var logTable = new Array(256);
  var value = 1;
  for (var i = 0; i < 255; i += 1) {
    expTable[i] = value;
    logTable[value] = i;
    value <<= 1;
    if (value & 0x100) {
      value ^= 0x11d;
    }
  }
  for (i = 255; i < 512; i += 1) {
    expTable[i] = expTable[i - 255];
  }

  function multiply(a, b) {
    if (!a || !b) {
      return 0;
    }
    return expTable[logTable[a] + logTable[b]];
  }

  function polynomialMultiply(left, right) {
    var out = new Array(left.length + right.length - 1).fill(0);
    left.forEach(function (a, ai) {
      right.forEach(function (b, bi) {
        out[ai + bi] ^= multiply(a, b);
      });
    });
    return out;
  }

  function eccFor(data, amount) {
    var generator = [1];
    for (var i = 0; i < amount; i += 1) {
      generator = polynomialMultiply(generator, [1, expTable[i]]);
    }
    var result = data.concat(new Array(amount).fill(0));
    for (i = 0; i < data.length; i += 1) {
      var factor = result[i];
      if (!factor) {
        continue;
      }
      generator.forEach(function (coefficient, index) {
        result[i + index] ^= multiply(coefficient, factor);
      });
    }
    return result.slice(data.length);
  }

  function appendBits(target, number, length) {
    for (var i = length - 1; i >= 0; i -= 1) {
      target.push((number >>> i) & 1);
    }
  }

  function getBytes(text) {
    return Array.prototype.slice.call(new TextEncoder().encode(text));
  }

  function selectVersion(byteLength) {
    for (var version = 1; version <= 5; version += 1) {
      if (byteLength <= capacities[version].data - 2) {
        return version;
      }
    }
    throw new Error("Link is too long. Keep the QR destination under 80 characters.");
  }

  function makeCodewords(text, version) {
    var info = capacities[version];
    var bytes = getBytes(text);
    var bits = [];
    appendBits(bits, 4, 4);
    appendBits(bits, bytes.length, 8);
    bytes.forEach(function (byte) {
      appendBits(bits, byte, 8);
    });
    var bitLimit = info.data * 8;
    appendBits(bits, 0, Math.min(4, bitLimit - bits.length));
    while (bits.length % 8 !== 0) {
      bits.push(0);
    }
    var data = [];
    for (var i = 0; i < bits.length; i += 8) {
      var byte = 0;
      for (var j = 0; j < 8; j += 1) {
        byte = (byte << 1) | bits[i + j];
      }
      data.push(byte);
    }
    var pads = [0xec, 0x11];
    while (data.length < info.data) {
      data.push(pads[(data.length - Math.ceil(bits.length / 8)) % 2]);
    }

    var blocks = [];
    var offset = 0;
    info.blocks.forEach(function (group) {
      for (var block = 0; block < group.count; block += 1) {
        var part = data.slice(offset, offset + group.data);
        blocks.push({ data: part, ecc: eccFor(part, group.ecc) });
        offset += group.data;
      }
    });

    var codewords = [];
    var longestData = Math.max.apply(null, blocks.map(function (block) { return block.data.length; }));
    for (i = 0; i < longestData; i += 1) {
      blocks.forEach(function (block) {
        if (i < block.data.length) {
          codewords.push(block.data[i]);
        }
      });
    }
    var longestEcc = Math.max.apply(null, blocks.map(function (block) { return block.ecc.length; }));
    for (i = 0; i < longestEcc; i += 1) {
      blocks.forEach(function (block) {
        if (i < block.ecc.length) {
          codewords.push(block.ecc[i]);
        }
      });
    }
    return codewords;
  }

  function blankMatrix(version) {
    var size = 17 + version * 4;
    return new Array(size).fill(null).map(function () {
      return new Array(size).fill(null);
    });
  }

  function finder(matrix, row, col) {
    for (var r = -1; r <= 7; r += 1) {
      for (var c = -1; c <= 7; c += 1) {
        if (row + r < 0 || row + r >= matrix.length || col + c < 0 || col + c >= matrix.length) {
          continue;
        }
        var inPattern = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        var dark = inPattern && (r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        matrix[row + r][col + c] = dark;
      }
    }
  }

  function alignment(matrix, centers) {
    centers.forEach(function (row) {
      centers.forEach(function (col) {
        if (matrix[row][col] !== null) {
          return;
        }
        for (var r = -2; r <= 2; r += 1) {
          for (var c = -2; c <= 2; c += 1) {
            matrix[row + r][col + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
          }
        }
      });
    });
  }

  function setupFixedPatterns(matrix, version) {
    var size = matrix.length;
    finder(matrix, 0, 0);
    finder(matrix, size - 7, 0);
    finder(matrix, 0, size - 7);
    alignment(matrix, capacities[version].align);
    for (var i = 8; i < size - 8; i += 1) {
      if (matrix[6][i] === null) {
        matrix[6][i] = i % 2 === 0;
      }
      if (matrix[i][6] === null) {
        matrix[i][6] = i % 2 === 0;
      }
    }
  }

  function bchFormat(mask) {
    var data = mask;
    var value = data << 10;
    var generator = 0x537;
    while ((Math.floor(Math.log2(value)) - Math.floor(Math.log2(generator))) >= 0) {
      value ^= generator << (Math.floor(Math.log2(value)) - Math.floor(Math.log2(generator)));
    }
    return ((data << 10) | value) ^ 0x5412;
  }

  function formatInfo(matrix, mask) {
    var size = matrix.length;
    var data = bchFormat(mask);
    for (var i = 0; i < 15; i += 1) {
      var dark = ((data >> i) & 1) === 1;
      if (i < 6) {
        matrix[i][8] = dark;
      } else if (i < 8) {
        matrix[i + 1][8] = dark;
      } else {
        matrix[size - 15 + i][8] = dark;
      }
      if (i < 8) {
        matrix[8][size - i - 1] = dark;
      } else if (i < 9) {
        matrix[8][15 - i] = dark;
      } else {
        matrix[8][15 - i - 1] = dark;
      }
    }
    matrix[size - 8][8] = true;
  }

  function maskBit(mask, row, col) {
    switch (mask) {
      case 0: return (row + col) % 2 === 0;
      case 1: return row % 2 === 0;
      case 2: return col % 3 === 0;
      case 3: return (row + col) % 3 === 0;
      case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
      case 5: return (row * col) % 2 + (row * col) % 3 === 0;
      case 6: return ((row * col) % 2 + (row * col) % 3) % 2 === 0;
      default: return ((row * col) % 3 + (row + col) % 2) % 2 === 0;
    }
  }

  function addData(matrix, words, mask) {
    var bits = [];
    words.forEach(function (word) {
      appendBits(bits, word, 8);
    });
    var index = 0;
    var row = matrix.length - 1;
    var step = -1;
    for (var col = matrix.length - 1; col > 0; col -= 2) {
      if (col === 6) {
        col -= 1;
      }
      while (true) {
        for (var side = 0; side < 2; side += 1) {
          var x = col - side;
          if (matrix[row][x] === null) {
            var bit = index < bits.length && bits[index] === 1;
            matrix[row][x] = maskBit(mask, row, x) ? !bit : bit;
            index += 1;
          }
        }
        row += step;
        if (row < 0 || row >= matrix.length) {
          row -= step;
          step = -step;
          break;
        }
      }
    }
  }

  function penalty(matrix) {
    var score = 0;
    var size = matrix.length;
    function scoreRuns(line) {
      var run = 1;
      for (var i = 1; i <= line.length; i += 1) {
        if (i < line.length && line[i] === line[i - 1]) {
          run += 1;
        } else {
          if (run >= 5) {
            score += 3 + run - 5;
          }
          run = 1;
        }
      }
      var string = line.map(function (cell) { return cell ? "1" : "0"; }).join("");
      var pattern = /00001011101|10111010000/g;
      var matches = string.match(pattern);
      if (matches) {
        score += matches.length * 40;
      }
    }
    for (var r = 0; r < size; r += 1) {
      scoreRuns(matrix[r]);
      scoreRuns(matrix.map(function (row) { return row[r]; }));
    }
    for (r = 0; r < size - 1; r += 1) {
      for (var c = 0; c < size - 1; c += 1) {
        var cell = matrix[r][c];
        if (cell === matrix[r][c + 1] && cell === matrix[r + 1][c] && cell === matrix[r + 1][c + 1]) {
          score += 3;
        }
      }
    }
    var dark = matrix.reduce(function (count, row) {
      return count + row.filter(Boolean).length;
    }, 0);
    score += Math.floor(Math.abs(dark * 100 / (size * size) - 50) / 5) * 10;
    return score;
  }

  window.createQrMatrix = function (text) {
    var version = selectVersion(getBytes(text).length);
    var words = makeCodewords(text, version);
    var best = null;
    var bestScore = Infinity;
    for (var mask = 0; mask < 8; mask += 1) {
      var matrix = blankMatrix(version);
      setupFixedPatterns(matrix, version);
      formatInfo(matrix, mask);
      addData(matrix, words, mask);
      var score = penalty(matrix);
      if (score < bestScore) {
        best = matrix;
        bestScore = score;
      }
    }
    return best;
  };
}());

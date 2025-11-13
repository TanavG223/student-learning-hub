'use strict';

(function initLearnHub() {
  if (typeof window === 'undefined' || !window.localStorage) return;

  const RESOURCE_KEY = 'learnhubResources';
  const RESOURCE_VERSION_KEY = 'learnhubResourceVersion';
  const RESOURCE_VERSION = '4.3.0';
  const PROGRESS_KEY = 'learnhubProgress';
  const TEAM_STORE_KEY = 'learnhubTeams';
  const HISTORY_KEY = 'learnhubHistory';
  const HISTORY_LIMIT = 60;
  const USER_KEY = 'learnhubUser';
  const DEFAULT_AI_ENDPOINT = 'http://localhost:11434/api/generate';
  const DEFAULT_AI_MODEL = 'llama2';

  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffle = (array) => array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

  const mathGenerators = {
    counting(grade) {
      const step = randomInt(1, Math.min(5, grade + 2));
      const start = randomInt(grade, grade + 5) * step;
      const sequence = Array.from({ length: 4 }, (_, idx) => start + idx * step);
      const answer = sequence[sequence.length - 1] + step;
      const distractors = shuffle([
        answer - step,
        answer + step,
        answer + step * 2
      ]);
      return {
        prompt: `What number comes next in the pattern ${sequence.join(', ')}, ?`,
        options: shuffle([answer, ...distractors]).map(String),
        answer: String(answer),
        explanation: 'Look at how much each number increases; that difference repeats.'
      };
    },
    placeValue(grade) {
      const digits = Math.min(grade + 2, 6);
      const number = randomInt(10 ** (digits - 1), 10 ** digits - 1);
      const expandedParts = number
        .toString()
        .split('')
        .map((digit, idx, arr) => `${digit}${'0'.repeat(arr.length - idx - 1)}`);
      const correct = expandedParts.join(' + ');
      const distractors = shuffle([
        expandedParts.slice(0, -1).join(' + '),
        `${expandedParts[0]} + ${expandedParts.slice(1).reverse().join(' + ')}`,
        expandedParts.map((part) => part.replace(/0/g, '')).join(' + ')
      ]);
      return {
        prompt: `Write ${number.toLocaleString()} in expanded form.`,
        options: shuffle([correct, ...distractors]).slice(0, 4),
        answer: correct,
        explanation: 'Expanded form expresses each digit multiplied by its place value.'
      };
    },
    addSub(grade) {
      const a = randomInt(100 * grade, 100 * grade + 400);
      const b = randomInt(50 * grade, 50 * grade + 250);
      const op = Math.random() > 0.5 ? '+' : '-';
      const answer = op === '+' ? a + b : a - b;
      const distractors = [answer + randomInt(-25, -5), answer + randomInt(5, 25), answer + randomInt(-50, 50)];
      return {
        prompt: `Compute ${a} ${op} ${b}.`,
        options: shuffle([answer, ...distractors]).map(String).slice(0, 4),
        answer: String(answer),
        explanation: 'Align place values to add or subtract accurately.'
      };
    },
    fractions() {
      const denominator = randomInt(3, 9);
      const numerator = randomInt(1, denominator - 1);
      const other = randomInt(1, denominator - 1);
      return {
        prompt: `Add ${numerator}/${denominator} + ${other}/${denominator}.`,
        options: shuffle([
          `${numerator + other}/${denominator}`,
          `${numerator + other}/${denominator * 2}`,
          `${numerator * other}/${denominator}`,
          `${numerator + other}/${denominator + 1}`
        ]),
        answer: `${numerator + other}/${denominator}`,
        explanation: 'With common denominators, add numerators only.'
      };
    },
    ratios() {
      const flour = randomInt(2, 9);
      const sugar = randomInt(2, 9);
      const scale = randomInt(2, 4);
      return {
        prompt: `A recipe uses ${flour} cups flour for ${sugar} cups sugar. How much sugar for ${flour * scale} cups flour?`,
        options: shuffle([
          `${sugar * scale}`,
          `${sugar + scale}`,
          `${flour * scale}`,
          `${sugar * scale - 1}`
        ]),
        answer: `${sugar * scale}`,
        explanation: 'Multiply both parts of the ratio by the same factor.'
      };
    },
    linear() {
      const m = randomInt(-5, 5) || 2;
      const b = randomInt(-8, 8);
      return {
        prompt: `What is the y-intercept of y = ${m}x ${b >= 0 ? '+ ' : '- '}${Math.abs(b)}?`,
        options: shuffle([`${b}`, `${m}`, `${b + m}`, `${-b}`]),
        answer: `${b}`,
        explanation: 'In y = mx + b, the intercept is b.'
      };
    },
    geometry() {
      const legA = randomInt(3, 10);
      const legB = randomInt(3, 10);
      const hyp = Math.sqrt(legA ** 2 + legB ** 2);
      const precise = Number.isInteger(hyp) ? hyp : hyp.toFixed(2);
      return {
        prompt: `A right triangle has legs ${legA} cm and ${legB} cm. Find the hypotenuse.`,
        options: shuffle([String(precise), String(legA + legB), String(Math.abs(legA - legB)), String((legA + legB) / 2)]),
        answer: String(precise),
        explanation: 'Use the Pythagorean theorem: c = √(a² + b²).'
      };
    },
    quadratics() {
      const r1 = randomInt(-6, 6) || 2;
      const r2 = randomInt(-6, 6) || -3;
      const a = randomInt(1, 3);
      const b = -a * (r1 + r2);
      const c = a * r1 * r2;
      const correct = `(x ${r1 >= 0 ? '- ' + r1 : '+ ' + Math.abs(r1)})(x ${r2 >= 0 ? '- ' + r2 : '+ ' + Math.abs(r2)})`;
      return {
        prompt: `Factor ${a}x² ${b >= 0 ? '+ ' : '- '}${Math.abs(b)}x ${c >= 0 ? '+ ' : '- '}${Math.abs(c)} = 0.`,
        options: shuffle([
          correct,
          `(x ${-r1 >= 0 ? '- ' + -r1 : '+ ' + Math.abs(-r1)})(x ${r2 >= 0 ? '- ' + r2 : '+ ' + Math.abs(r2)})`,
          `(x ${r1 >= 0 ? '+ ' + r1 : '- ' + Math.abs(r1)})(x ${r2 >= 0 ? '+ ' + r2 : '- ' + Math.abs(r2)})`,
          `(x ${-r1 >= 0 ? '+ ' + -r1 : '- ' + Math.abs(-r1)})(x ${-r2 >= 0 ? '+ ' + -r2 : '- ' + Math.abs(-r2)})`
        ]),
        answer: correct,
        explanation: 'Set each factor equal to zero to find the roots.'
      };
    },
    exponential() {
      const start = randomInt(200, 800);
      const factor = randomInt(2, 4);
      const cycles = randomInt(2, 4);
      const final = start * factor ** cycles;
      return {
        prompt: `A bacteria culture multiplies by ${factor} each hour. Starting with ${start}, how many after ${cycles} hours?`,
        options: shuffle([String(final), String(final / factor), String(final + start), String(final - start)]),
        answer: String(final),
        explanation: 'Repeated multiplication models exponential growth.'
      };
    },
    trig() {
      const angles = [30, 45, 60];
      const funcs = ['sin', 'cos', 'tan'];
      const angle = angles[randomInt(0, angles.length - 1)];
      const func = funcs[randomInt(0, funcs.length - 1)];
      const table = {
        sin: { 30: '1/2', 45: '√2/2', 60: '√3/2' },
        cos: { 30: '√3/2', 45: '√2/2', 60: '1/2' },
        tan: { 30: '√3/3', 45: '1', 60: '√3' }
      };
      const answer = table[func][angle];
      const distractors = shuffle(Object.values(table[func]).filter((val) => val !== answer));
      return {
        prompt: `Evaluate ${func}(${angle}°).`,
        options: shuffle([answer, ...distractors]).slice(0, 4),
        answer,
        explanation: 'Use special right triangle ratios for 30°-60°-90° and 45°-45°-90° triangles.'
      };
    },
    measurement(grade) {
      const length = randomInt(4, 10 + grade);
      const width = randomInt(3, 8 + grade);
      const askArea = Math.random() > 0.5;
      const answer = askArea ? length * width : 2 * (length + width);
      const label = askArea ? 'area' : 'perimeter';
      const unitLabel = askArea ? 'square units' : 'units';
      const distractors = askArea
        ? [answer + width, length * length, (length + width) * 2]
        : [answer + 2, 2 * (length + width + 2), answer - 4];
      return {
        prompt: `Find the ${label} of a rectangle with length ${length} units and width ${width} units.`,
        options: shuffle([answer, ...distractors]).map((value) => `${value} ${unitLabel}`),
        answer: `${answer} ${unitLabel}`,
        explanation: askArea ? 'Area = length × width.' : 'Perimeter adds all the sides: 2ℓ + 2w.'
      };
    },
    decimals(grade) {
      const a = (randomInt(10, 90) / 10).toFixed(1);
      const b = (randomInt(10, 90) / 10).toFixed(1);
      const answerValue = parseFloat(a) + parseFloat(b);
      const answer = answerValue.toFixed(1);
      return {
        prompt: `Add ${a} + ${b}.`,
        options: shuffle([
          answer,
          (answerValue - 0.1).toFixed(1),
          (answerValue + 0.1).toFixed(1),
          (answerValue + 1).toFixed(1)
        ]),
        answer,
        explanation: 'Line up decimal points and add place by place.'
      };
    },
    multiplication(grade) {
      const a = randomInt(grade + 2, grade + 9);
      const b = randomInt(2, 12);
      const answer = a * b;
      return {
        prompt: `Compute ${a} × ${b}.`,
        options: shuffle([answer, answer + b, answer - b, answer + 10]),
        answer: String(answer),
        explanation: 'Use repeated addition or area models to multiply.'
      };
    },
    statistics() {
      const values = [randomInt(20, 80), randomInt(30, 90), randomInt(10, 70), randomInt(40, 95)];
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const sorted = [...values].sort((a, b) => a - b);
      const median = (sorted[1] + sorted[2]) / 2;
      const askMean = Math.random() > 0.5;
      const expectedValue = askMean ? mean : median;
      const expected = expectedValue.toFixed(1);
      return {
        prompt: `For the data set ${values.join(', ')}, what is the ${askMean ? 'mean' : 'median'}?`,
        options: shuffle([
          expected,
          (expectedValue - 2).toFixed(1),
          (expectedValue + 1).toFixed(1),
          sorted[0].toFixed(1)
        ]),
        answer: expected,
        explanation: askMean ? 'Mean averages all values.' : 'Median is the middle of the ordered data.'
      };
    },
    probability() {
      const faces = 6;
      const askGreater = Math.random() > 0.5;
      const promptText = askGreater
        ? 'a number greater than 4'
        : `the number ${randomInt(1, faces)}`;
      const numerator = askGreater ? 2 : 1;
      return {
        prompt: `A fair die is rolled. What is the probability of rolling ${promptText}?`,
        options: shuffle(['1/6', '2/6', '3/6', '4/6']),
        answer: `${numerator}/6`,
        explanation: 'Probability = favorable outcomes divided by total outcomes.'
      };
    },
    integers() {
      const a = randomInt(-12, 12);
      const b = randomInt(-12, 12);
      const answer = a + b;
      return {
        prompt: `Compute ${a} + ${b}.`,
        options: shuffle([answer, answer + 2, answer - 2, -answer]).map(String),
        answer: String(answer),
        explanation: 'Combine positives and negatives carefully using a number line.'
      };
    },
    systems() {
      const x = randomInt(1, 8);
      const y = randomInt(1, 8);
      const a = randomInt(1, 4);
      const b = randomInt(1, 4);
      const c1 = a * x + b * y;
      const c2 = x - y;
      return {
        prompt: `Solve the system: ${a}x + ${b}y = ${c1} and x − y = ${c2}. What is x?`,
        options: shuffle([x, x + 1, x - 1, y]).map(String),
        answer: String(x),
        explanation: 'Use substitution: from x − y = c₂, express x = y + c₂ and substitute.'
      };
    },
    inequalities() {
      const a = randomInt(2, 6);
      const b = randomInt(3, 12);
      const c = randomInt(20, 40);
      const threshold = (c - b) / a;
      const smallestInteger = Math.floor(threshold) + 1;
      return {
        prompt: `Solve ${a}x + ${b} > ${c}. What is the smallest integer value of x that satisfies the inequality?`,
        options: shuffle([smallestInteger, smallestInteger + 1, smallestInteger - 1, smallestInteger + 2]).map(String),
        answer: String(smallestInteger),
        explanation: `Subtract ${b}, divide by ${a}, and choose the next integer greater than ${(threshold).toFixed(2)}.`
      };
    },
    sequence() {
      const start = randomInt(1, 8);
      const diff = randomInt(2, 9);
      const n = randomInt(5, 9);
      const answer = start + (n - 1) * diff;
      return {
        prompt: `For the arithmetic sequence starting at ${start} with a common difference of ${diff}, what is term ${n}?`,
        options: shuffle([answer, answer + diff, answer - diff, start + n]).map(String),
        answer: String(answer),
        explanation: 'Use aₙ = a₁ + (n − 1)d.'
      };
    },
    calculus() {
      const a = randomInt(1, 5);
      const b = randomInt(-6, 6);
      const c = randomInt(-10, 10);
      return {
        prompt: `If f(x) = ${a}x² ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}x ${c >= 0 ? '+ ' + c : '- ' + Math.abs(c)}, what is f′(x)?`,
        options: shuffle([
          `${2 * a}x ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}`,
          `${2 * a}x² ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}`,
          `${a}x + ${b}`,
          `${2 * a}x ${b >= 0 ? '- ' + b : '+ ' + Math.abs(b)}`
        ]),
        answer: `${2 * a}x ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}`,
        explanation: 'Differentiate term by term: derivative of ax² is 2ax, derivative of bx is b.'
      };
    }
  };

  const readingGenerators = {
    mainIdea() {
      const topics = ['solar panels', 'pollination', 'healthy school lunches', 'community libraries'];
      const topic = topics[randomInt(0, topics.length - 1)];
      const detail = `${topic} provide clear benefits such as improving local wellbeing.`;
      return {
        prompt: `Which detail best supports the main idea that ${topic} are valuable?`,
        options: shuffle([detail, `${topic} can be loud.`, `${topic} cost money.`, `${topic} have vowels.`]),
        answer: detail,
        explanation: 'Supporting details directly reinforce the central idea.'
      };
    },
    figurative() {
      const metaphors = ['Her voice was warm velvet', 'The hallway was a roaring river'];
      const metaphor = metaphors[randomInt(0, metaphors.length - 1)];
      return {
        prompt: `"${metaphor}" is an example of which device?`,
        options: shuffle(['Metaphor', 'Simile', 'Hyperbole', 'Alliteration']),
        answer: 'Metaphor',
        explanation: 'Metaphors compare two things directly without “like” or “as”.'
      };
    },
    fluency() {
      const words = ['resilient', 'serene', 'vintage'];
      const word = words[randomInt(0, words.length - 1)];
      return {
        prompt: `Which sentence uses context clues to define "${word}"?`,
        options: shuffle([
          `After the storm, the ${word} town rebuilt quickly, showing strong recovery.`,
          `${word} rhymes with green.`,
          `${word} is spelled with vowels.`,
          `${word} is the author’s favorite word.`
        ]),
        answer: `After the storm, the ${word} town rebuilt quickly, showing strong recovery.`,
        explanation: 'Effective context clues restate or define the word using synonyms.'
      };
    },
    argument() {
      const issues = ['school uniforms', 'later start times', 'community gardens'];
      const issue = issues[randomInt(0, issues.length - 1)];
      return {
        prompt: `Which statement is the clearest claim about ${issue}?`,
        options: shuffle([
          `${issue} improve student focus by reducing distractions.`,
          `${issue} exist in some cities.`,
          `${issue} are sometimes colorful.`,
          `${issue} are nouns.`
        ]),
        answer: `${issue} improve student focus by reducing distractions.`,
        explanation: 'Strong claims are specific and arguable.'
      };
    },
    structure() {
      const structures = ['compare/contrast', 'cause/effect', 'problem/solution'];
      const structure = structures[randomInt(0, structures.length - 1)];
      const signals = {
        'compare/contrast': 'however',
        'cause/effect': 'therefore',
        'problem/solution': 'solution'
      };
      const correct = signals[structure];
      return {
        prompt: `Which signal word often indicates a ${structure} text?`,
        options: shuffle([correct, 'quickly', 'tomorrow', 'purple']),
        answer: correct,
        explanation: 'Signal words cue the reader to relationships between ideas.'
      };
    },
    research() {
      return {
        prompt: 'What helps avoid plagiarism when researching?',
        options: shuffle([
          'Track sources with citations while paraphrasing',
          'Copy sentences word for word',
          'Skip recording URLs',
          'Only summarize from memory'
        ]),
        answer: 'Track sources with citations while paraphrasing',
        explanation: 'Accurate notes and citations keep research ethical.'
      };
    },
    rhetoric() {
      const appeals = ['Ethos', 'Logos', 'Pathos'];
      const appeal = appeals[randomInt(0, appeals.length - 1)];
      const descriptions = { Ethos: 'credibility and trust', Logos: 'logic and evidence', Pathos: 'emotion and values' };
      return {
        prompt: `Which appeal emphasizes ${descriptions[appeal]}?`,
        options: shuffle(appeals),
        answer: appeal,
        explanation: 'Each rhetorical appeal targets a different facet of persuasion.'
      };
    },
    literary() {
      const symbols = ['river', 'mirror', 'journey'];
      const symbol = symbols[randomInt(0, symbols.length - 1)];
      return {
        prompt: `When an author repeats the ${symbol} image, what should readers analyze?`,
        options: shuffle([
          'Its deeper symbolic meaning and changes',
          'The printer settings',
          'The author’s handwriting',
          'Only the literal description'
        ]),
        answer: 'Its deeper symbolic meaning and changes',
        explanation: 'Repeated images often function as symbols that develop theme.'
      };
    },
    synthesis() {
      const topics = ['renewable energy', 'city transit', 'healthy lunch programs'];
      const topic = topics[randomInt(0, topics.length - 1)];
      return {
        prompt: `In a synthesis essay about ${topic}, what should the thesis do?`,
        options: shuffle([
          'Make an arguable claim connecting the sources',
          'List every quotation chronologically',
          'Ignore conflicting evidence',
          'Describe unrelated personal stories'
        ]),
        answer: 'Make an arguable claim connecting the sources',
        explanation: 'Synthesis requires a defensible claim that unites the sources.'
      };
    }
  };

  const mathGradeCatalog = {
    1: [
      { unit: 'Unit 1: Counting & Number Patterns', title: 'Counting within 120', description: 'Khan Academy · Grade 1 Counting', videoId: 'HWxFN7KSM2E', generator: 'counting' },
      { unit: 'Unit 2: Place Value Foundations', title: 'Place Value & Base Ten', description: 'Khan Academy · Grade 1 Place Value', videoId: 'HWxFN7KSM2E', generator: 'placeValue' },
      { unit: 'Unit 3: Addition & Subtraction Facts', title: 'Strategies for +/- 20', description: 'Khan Academy · Grade 1 Addition', videoId: 'QkPa9V2wtZs', generator: 'addSub' },
      { unit: 'Unit 4: Measurement & Time', title: 'Length, Time, and Data', description: 'Khan Academy · Grade 1 Measurement', videoId: 'DnFrOetuUKg', generator: 'measurement' },
      { unit: 'Unit 5: Shapes & Equal Parts', title: 'Halves and Quarters', description: 'Khan Academy · Grade 1 Geometry', videoId: 'jfG8ZxwK0Kk', generator: 'fractions' },
      { unit: 'Unit 6: Picture Graphs', title: 'Collect & Organize Data', description: 'Khan Academy · Grade 1 Data', videoId: 'hsFWih0i9W8', generator: 'statistics' }
    ],
    2: [
      { unit: 'Unit 1: Addition & Subtraction within 1000', title: 'Strategies for +/- 1000', description: 'Khan Academy · Grade 2 Addition & Subtraction', videoId: 'QkPa9V2wtZs', generator: 'addSub' },
      { unit: 'Unit 2: Equal Groups & Arrays', title: 'Intro to Multiplication', description: 'Khan Academy · Grade 2 Multiplication', videoId: '1H3lW2rR9xQ', generator: 'multiplication' },
      { unit: 'Unit 3: Measurement & Data', title: 'Time, Money, and Graphs', description: 'Khan Academy · Grade 2 Measurement', videoId: 'DnFrOetuUKg', generator: 'measurement' },
      { unit: 'Unit 4: Base Ten & Place Value', title: 'Place Value Foundations', description: 'Khan Academy · Grade 2 Place Value', videoId: 'HWxFN7KSM2E', generator: 'placeValue' },
      { unit: 'Unit 5: Money & Decimals', title: 'Dollar and Cent Values', description: 'Khan Academy · Grade 2 Money', videoId: 'QkPa9V2wtZs', generator: 'decimals' },
      { unit: 'Unit 6: Graphs & Data Stories', title: 'Tally and Bar Graphs', description: 'Khan Academy · Grade 2 Data', videoId: 'hsFWih0i9W8', generator: 'statistics' }
    ],
    3: [
      { unit: 'Unit 1: Multiplication & Division Facts', title: 'Fluency with Facts', description: 'Khan Academy · Grade 3 Multiplication & Division', videoId: '1H3lW2rR9xQ', generator: 'multiplication' },
      { unit: 'Unit 2: Fractions & Number Line', title: 'Fractions in Context', description: 'Khan Academy · Grade 3 Fractions', videoId: 'DnFrOetuUKg', generator: 'fractions' },
      { unit: 'Unit 3: Area & Perimeter', title: 'Area Models & Measurement', description: 'Khan Academy · Grade 3 Measurement', videoId: 'jfG8ZxwK0Kk', generator: 'measurement' },
      { unit: 'Unit 4: Data & Graphs', title: 'Represent & Interpret Data', description: 'Khan Academy · Grade 3 Data', videoId: 'hsFWih0i9W8', generator: 'statistics' },
      { unit: 'Unit 5: Place Value & Rounding', title: 'Thousands and Ten-thousands', description: 'Khan Academy · Grade 3 Place Value', videoId: 'HWxFN7KSM2E', generator: 'placeValue' },
      { unit: 'Unit 6: Multi-digit Addition & Subtraction', title: 'Column Methods', description: 'Khan Academy · Grade 3 Addition/Subtraction', videoId: 'QkPa9V2wtZs', generator: 'addSub' }
    ],
    4: [
      { unit: 'Unit 1: Fraction Equivalence & Operations', title: 'Add & Subtract Fractions', description: 'Khan Academy · Grade 4 Fractions', videoId: 'DnFrOetuUKg', generator: 'fractions' },
      { unit: 'Unit 2: Decimals & Place Value', title: 'Tenths and Hundredths', description: 'Khan Academy · Grade 4 Decimals', videoId: 'QkPa9V2wtZs', generator: 'decimals' },
      { unit: 'Unit 3: Geometry & Angles', title: 'Lines, Angles, and Symmetry', description: 'Khan Academy · Grade 4 Geometry', videoId: 'jfG8ZxwK0Kk', generator: 'geometry' },
      { unit: 'Unit 4: Multiplication & Division Strategies', title: 'Multi-digit Products', description: 'Khan Academy · Grade 4 Multiplication', videoId: '1H3lW2rR9xQ', generator: 'multiplication' },
      { unit: 'Unit 5: Measurement Conversions', title: 'Metric and Customary Units', description: 'Khan Academy · Grade 4 Measurement', videoId: 'DnFrOetuUKg', generator: 'measurement' },
      { unit: 'Unit 6: Factors & Multiples', title: 'Prime vs Composite', description: 'Khan Academy · Grade 4 Number Theory', videoId: 'HWxFN7KSM2E', generator: 'counting' }
    ],
    5: [
      { unit: 'Unit 1: Fraction Operations', title: 'Multiply & Divide Fractions', description: 'Khan Academy · Grade 5 Fractions', videoId: 'DnFrOetuUKg', generator: 'fractions' },
      { unit: 'Unit 2: Decimal Operations', title: 'Add/Subtract Decimals', description: 'Khan Academy · Grade 5 Decimals', videoId: 'QkPa9V2wtZs', generator: 'decimals' },
      { unit: 'Unit 3: Volume & Measurement', title: 'Volume of Rectangular Prisms', description: 'Khan Academy · Grade 5 Measurement', videoId: 'jfG8ZxwK0Kk', generator: 'measurement' },
      { unit: 'Unit 4: Interpreting Data', title: 'Line Plots & Graphs', description: 'Khan Academy · Grade 5 Data', videoId: 'hsFWih0i9W8', generator: 'statistics' },
      { unit: 'Unit 5: Place Value to Millions', title: 'Powers of Ten Patterns', description: 'Khan Academy · Grade 5 Place Value', videoId: 'HWxFN7KSM2E', generator: 'placeValue' },
      { unit: 'Unit 6: Intro to Ratios', title: 'Scaling Recipes & Maps', description: 'Khan Academy · Grade 5 Ratios', videoId: '1H3lW2rR9xQ', generator: 'ratios' }
    ],
    6: [
      { unit: 'Unit 1: Ratios & Rates', title: 'Proportional Reasoning', description: 'Khan Academy · Grade 6 Ratios', videoId: '1H3lW2rR9xQ', generator: 'ratios' },
      { unit: 'Unit 2: Integers & Rational Numbers', title: 'Positive and Negative Numbers', description: 'Khan Academy · Grade 6 Integers', videoId: 'hsFWih0i9W8', generator: 'integers' },
      { unit: 'Unit 3: Statistics & Data', title: 'Distributions and Measures', description: 'Khan Academy · Grade 6 Statistics', videoId: 'hsFWih0i9W8', generator: 'statistics' },
      { unit: 'Unit 4: Geometry & Area', title: 'Polygons and Area', description: 'Khan Academy · Grade 6 Geometry', videoId: 'jfG8ZxwK0Kk', generator: 'geometry' },
      { unit: 'Unit 5: Expressions & Equations', title: 'One-step Equations', description: 'Khan Academy · Grade 6 Algebra', videoId: '4lI4XcUcYpo', generator: 'inequalities' },
      { unit: 'Unit 6: Measurement Conversions', title: 'Surface Area & Volume', description: 'Khan Academy · Grade 6 Measurement', videoId: 'DnFrOetuUKg', generator: 'measurement' }
    ],
    7: [
      { unit: 'Unit 1: Proportional Relationships', title: 'Rates, Ratios, and Percentages', description: 'Khan Academy · Grade 7 Ratios', videoId: '1H3lW2rR9xQ', generator: 'ratios' },
      { unit: 'Unit 2: Probability & Sampling', title: 'Chance Experiments', description: 'Khan Academy · Grade 7 Probability', videoId: 'hsFWih0i9W8', generator: 'probability' },
      { unit: 'Unit 3: Expressions & Inequalities', title: 'Two-Step Inequalities', description: 'Khan Academy · Grade 7 Algebra', videoId: '4lI4XcUcYpo', generator: 'inequalities' },
      { unit: 'Unit 4: Integers & Rational Numbers', title: 'Add/Subtract Rational Numbers', description: 'Khan Academy · Grade 7 Integers', videoId: 'hsFWih0i9W8', generator: 'integers' },
      { unit: 'Unit 5: Geometry & Scale Drawings', title: 'Scale Factors', description: 'Khan Academy · Grade 7 Geometry', videoId: 'jfG8ZxwK0Kk', generator: 'geometry' },
      { unit: 'Unit 6: Statistics & Variability', title: 'Mean Absolute Deviation', description: 'Khan Academy · Grade 7 Statistics', videoId: 'hsFWih0i9W8', generator: 'statistics' }
    ],
    8: [
      { unit: 'Unit 1: Linear Equations & Functions', title: 'Slope, y-intercept, and Graphs', description: 'Khan Academy · Grade 8 Linear Algebra', videoId: '4lI4XcUcYpo', generator: 'linear' },
      { unit: 'Unit 2: Systems of Equations', title: 'Solve by Graphing or Substitution', description: 'Khan Academy · Grade 8 Systems', videoId: '1H3lW2rR9xQ', generator: 'systems' },
      { unit: 'Unit 3: Transformations & Similarity', title: 'Dilations, Rotations, Reflections', description: 'Khan Academy · Grade 8 Geometry', videoId: 'jfG8ZxwK0Kk', generator: 'geometry' },
      { unit: 'Unit 4: Inequalities & Functions', title: 'Inequalities on the Number Line', description: 'Khan Academy · Grade 8 Algebra', videoId: '4lI4XcUcYpo', generator: 'inequalities' },
      { unit: 'Unit 5: Exponents & Scientific Notation', title: 'Powers & Roots', description: 'Khan Academy · Grade 8 Exponents', videoId: 'hsFWih0i9W8', generator: 'exponential' },
      { unit: 'Unit 6: Statistics & Probability', title: 'Two-way Tables', description: 'Khan Academy · Grade 8 Statistics', videoId: 'hsFWih0i9W8', generator: 'statistics' }
    ],
    9: [
      { unit: 'Unit 1: Quadratic Functions', title: 'Factoring and Vertex Form', description: 'Khan Academy · Algebra 1 Quadratics', videoId: 'jHwW5wy_L8o', generator: 'quadratics' },
      { unit: 'Unit 2: Exponential Functions', title: 'Growth and Decay', description: 'Khan Academy · Algebra 1 Exponentials', videoId: 'hsFWih0i9W8', generator: 'exponential' },
      { unit: 'Unit 3: Sequences & Function Notation', title: 'Arithmetic & Geometric Sequences', description: 'Khan Academy · Algebra 1 Functions', videoId: '1H3lW2rR9xQ', generator: 'sequence' },
      { unit: 'Unit 4: Inequalities & Absolute Value', title: 'Solve Linear Inequalities', description: 'Khan Academy · Algebra 1 Inequalities', videoId: '4lI4XcUcYpo', generator: 'inequalities' },
      { unit: 'Unit 5: Systems & Modeling', title: 'Linear Models', description: 'Khan Academy · Algebra 1 Modeling', videoId: '4lI4XcUcYpo', generator: 'systems' },
      { unit: 'Unit 6: Statistics & Probability', title: 'Regression Models', description: 'Khan Academy · Algebra 1 Data', videoId: 'hsFWih0i9W8', generator: 'statistics' }
    ],
    10: [
      { unit: 'Unit 1: Geometry of Circles', title: 'Arcs, Angles, and Chords', description: 'Khan Academy · Geometry Circles', videoId: 'jfG8ZxwK0Kk', generator: 'geometry' },
      { unit: 'Unit 2: Trigonometry Basics', title: 'Right Triangle Trig', description: 'Khan Academy · Geometry Trig', videoId: 'WUvTyaaNkzM', generator: 'trig' },
      { unit: 'Unit 3: Probability & Statistics', title: 'Conditional Probability', description: 'Khan Academy · Geometry Probability', videoId: 'hsFWih0i9W8', generator: 'probability' },
      { unit: 'Unit 4: Algebra Review', title: 'Quadratics and Functions', description: 'Khan Academy · Geometry Connections', videoId: 'jHwW5wy_L8o', generator: 'quadratics' },
      { unit: 'Unit 5: Transformations & Similarity', title: 'Proofs with Congruence', description: 'Khan Academy · Geometry Transformations', videoId: 'jfG8ZxwK0Kk', generator: 'geometry' },
      { unit: 'Unit 6: Sequences & Series', title: 'Recursive Patterns', description: 'Khan Academy · Geometry Connections', videoId: '1H3lW2rR9xQ', generator: 'sequence' }
    ],
    11: [
      { unit: 'Unit 1: Exponential & Log Models', title: 'Logs and Inverses', description: 'Khan Academy · Algebra 2 Logarithms', videoId: 'hsFWih0i9W8', generator: 'exponential' },
      { unit: 'Unit 2: Trigonometric Functions', title: 'Unit Circle & Graphs', description: 'Khan Academy · Precalculus Trig', videoId: 'WUvTyaaNkzM', generator: 'trig' },
      { unit: 'Unit 3: Sequences & Series', title: 'Arithmetic and Geometric Series', description: 'Khan Academy · Precalculus Sequences', videoId: '1H3lW2rR9xQ', generator: 'sequence' },
      { unit: 'Unit 4: Probability & Statistics', title: 'Normal Distribution & Sampling', description: 'Khan Academy · Precalculus Probability', videoId: 'hsFWih0i9W8', generator: 'statistics' },
      { unit: 'Unit 5: Polynomial Functions', title: 'Power and Root Functions', description: 'Khan Academy · Algebra 2 Polynomials', videoId: 'jHwW5wy_L8o', generator: 'quadratics' },
      { unit: 'Unit 6: Matrices & Systems', title: 'Solve with Matrices', description: 'Khan Academy · Algebra 2 Matrices', videoId: '1H3lW2rR9xQ', generator: 'systems' }
    ],
    12: [
      { unit: 'Unit 1: Limits & Derivatives', title: 'Intro to Calculus', description: 'Khan Academy · AP Calculus', videoId: 'WUvTyaaNkzM', generator: 'calculus' },
      { unit: 'Unit 2: Probability & Combinatorics', title: 'Counting Techniques', description: 'Khan Academy · AP Statistics', videoId: 'hsFWih0i9W8', generator: 'probability' },
      { unit: 'Unit 3: Vectors & Parametric Motion', title: 'Vectors in the Plane', description: 'Khan Academy · AP Calculus Prep', videoId: 'jfG8ZxwK0Kk', generator: 'geometry' },
      { unit: 'Unit 4: Sequences & Series', title: 'Taylor Series and Approximations', description: 'Khan Academy · AP Calculus Series', videoId: '1H3lW2rR9xQ', generator: 'sequence' },
      { unit: 'Unit 5: Differential Equations', title: 'Slope Fields & Modeling', description: 'Khan Academy · AP Calculus Differential Equations', videoId: 'WUvTyaaNkzM', generator: 'calculus' },
      { unit: 'Unit 6: Probability Distributions', title: 'Confidence Intervals', description: 'Khan Academy · AP Statistics Distributions', videoId: 'hsFWih0i9W8', generator: 'statistics' }
    ]
  };


  const mathBandCatalog = {
    elementary: [
      { unit: 'Unit 1: Place Value & Base Ten', title: 'Place Value & Expanded Form', description: 'Khan Academy · Number & Operations in Base Ten', videoId: 'HWxFN7KSM2E', generator: 'placeValue' },
      { unit: 'Unit 2: Addition & Subtraction Strategies', title: 'Multi-Digit Addition & Subtraction', description: 'Khan Academy · Grade 4 Addition & Subtraction', videoId: 'QkPa9V2wtZs', generator: 'addSub' },
      { unit: 'Unit 3: Fractions & Measurement', title: 'Fractions on the Number Line', description: 'Khan Academy · Grade 5 Fractions & Measurement', videoId: 'DnFrOetuUKg', generator: 'fractions' }
    ],
    middle: [
      { unit: 'Unit 4: Ratios & Unit Rates', title: 'Ratios, Rates, and Percents', description: 'Khan Academy · Grade 6 Ratios', videoId: '1H3lW2rR9xQ', generator: 'ratios' },
      { unit: 'Unit 5: Linear Functions & Slope', title: 'Slope-Intercept Form', description: 'Khan Academy · Grade 8 Linear Functions', videoId: '4lI4XcUcYpo', generator: 'linear' },
      { unit: 'Unit 6: Geometry & Pythagorean Theorem', title: 'Right Triangles and Distance', description: 'Khan Academy · Grade 8 Geometry', videoId: 'jfG8ZxwK0Kk', generator: 'geometry' }
    ],
    high: [
      { unit: 'Unit 7: Quadratic Functions', title: 'Quadratic Functions and Factoring', description: 'Khan Academy · Algebra II Quadratics', videoId: 'jHwW5wy_L8o', generator: 'quadratics' },
      { unit: 'Unit 8: Exponential & Logarithmic Models', title: 'Exponential Models and Logs', description: 'Khan Academy · Exponential & Log Functions', videoId: 'hsFWih0i9W8', generator: 'exponential' },
      { unit: 'Unit 9: Trigonometry & Limits', title: 'Trigonometry, Vectors, and Limits', description: 'Khan Academy · Precalculus Prep', videoId: 'WUvTyaaNkzM', generator: 'trig' }
    ]
  };

  const gradeTier = (grade) => {
    if (grade <= 5) return 'elementary';
    if (grade <= 8) return 'middle';
    return 'high';
  };

  const generateQuestionSet = (generatorKey, grade, count, generatorsMap) => {
    const generator = generatorsMap[generatorKey];
    if (!generator) return [];
    return Array.from({ length: count }, () => generator(grade));
  };

  const buildResources = () => {
    const resources = [];
    for (let grade = 1; grade <= 12; grade += 1) {
      const tier = gradeTier(grade);
      const units = mathGradeCatalog[grade] || mathBandCatalog[tier] || [];
      units.forEach((unit, index) => {
        const generatorKey = { domain: 'math', key: unit.generator, grade };
        resources.push({
          id: `math-${grade}-${index + 1}`,
          subject: 'Math',
          grade: String(grade),
          unit: unit.unit,
          title: `Grade ${grade} Math – ${unit.title}`,
          type: 'Lesson',
          description: `${unit.description} · Grade ${grade}`,
          videoId: unit.videoId,
          practice: generateQuestionSet(unit.generator, grade, 3, mathGenerators),
          test: generateQuestionSet(unit.generator, grade, 4, mathGenerators),
          questionGenerator: generatorKey
        });
      });
    }
    return resources;
  };

  const baseResources = buildResources();

  function seedResources() {
    window.localStorage.setItem(RESOURCE_KEY, JSON.stringify(baseResources));
    window.localStorage.setItem(RESOURCE_VERSION_KEY, RESOURCE_VERSION);
  }

  function readHistory() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch (_) {
      return [];
    }
  }

  function addHistoryEntry(entry) {
    const next = [{ ...entry, timestamp: new Date().toISOString() }, ...readHistory()].slice(0, HISTORY_LIMIT);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }

  const ensureProgressShape = (rawProgress = {}) => {
    const userGrade = getUser()?.grade || 1;
    return {
      grade: rawProgress.grade || userGrade,
      points: rawProgress.points || 0,
      groupPoints: rawProgress.groupPoints || 0,
      badges: rawProgress.badges || [],
      streakCount: rawProgress.streakCount || 0,
      lastActiveDate: rawProgress.lastActiveDate || null,
      teamCode: rawProgress.teamCode || null
    };
  };

  function getProgress() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) || 'null');
      return ensureProgressShape(stored || {});
    } catch (_) {
      return ensureProgressShape({});
    }
  }

  function saveProgress(progress) {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return progress;
  }

  const readTeams = () => {
    try {
      const store = JSON.parse(window.localStorage.getItem(TEAM_STORE_KEY) || '{}');
      return typeof store === 'object' && store ? store : {};
    } catch (_) {
      return {};
    }
  };

  const writeTeams = (teams) => {
    window.localStorage.setItem(TEAM_STORE_KEY, JSON.stringify(teams));
  };

  const ensureTeamEntry = (code) => {
    const teams = readTeams();
    if (!teams[code]) {
      teams[code] = { points: 0 };
      writeTeams(teams);
    }
    return teams[code];
  };

  const addPointsToTeam = (code, amount) => {
    if (!code || !amount) return null;
    const teams = readTeams();
    teams[code] = teams[code] || { points: 0 };
    teams[code].points += amount;
    writeTeams(teams);
    return teams[code];
  };

  const getTeamPointsValue = (code) => {
    if (!code) return 0;
    return readTeams()[code]?.points || 0;
  };

  const generateTeamCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const dateDiffInDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  function addPoints(points, context = 'practice') {
    if (!points) return null;
    const progress = getProgress();
    progress.points += points;
    const personalTokens = Math.round(points / 2);
    progress.groupPoints += personalTokens;

    const today = new Date().toISOString().split('T')[0];
    if (progress.lastActiveDate) {
      const diff = dateDiffInDays(progress.lastActiveDate, today);
      if (diff === 1) {
        progress.streakCount += 1;
      } else if (diff > 1) {
        progress.streakCount = 1;
      }
    } else {
      progress.streakCount = 1;
    }
    progress.lastActiveDate = today;

    const badgeThresholds = [100, 250, 500, 800, 1200];
    badgeThresholds.forEach((threshold) => {
      if (progress.points >= threshold && !progress.badges.includes(threshold)) {
        progress.badges.push(threshold);
      }
    });

    if (progress.teamCode) {
      addPointsToTeam(progress.teamCode, points);
    }

    saveProgress(progress);
    return { ...progress, lastAward: { points, context } };
  }

  const getGradeCap = () => {
    const profileGrade = getUser()?.grade || 1;
    const progress = getProgress();
    const bonusGrades = Math.floor((progress.points || 0) / 400);
    return Math.min(12, profileGrade + bonusGrades);
  };

  function getUser() {
    try {
      return JSON.parse(window.localStorage.getItem(USER_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  const isLoggedIn = () => Boolean(getUser());
  const loginUser = (profile) => window.localStorage.setItem(USER_KEY, JSON.stringify(profile));
  const logoutUser = () => window.localStorage.removeItem(USER_KEY);

  seedResources();

  window.learnHub = window.learnHub || {};
  window.learnHub.history = {
    add: addHistoryEntry,
    all: readHistory,
    recent(limit = 6) {
      return readHistory().slice(0, limit);
    }
  };

  window.learnHub.auth = {
    login: loginUser,
    logout: logoutUser,
    isLoggedIn
  };

  window.learnHub.resources = {
    all() {
      try {
        const stored = JSON.parse(window.localStorage.getItem(RESOURCE_KEY) || '[]');
        if (Array.isArray(stored) && stored.length) {
          return stored;
        }
      } catch (_) {
        // ignore and fall back
      }
      seedResources();
      try {
        return JSON.parse(window.localStorage.getItem(RESOURCE_KEY) || '[]');
      } catch (_) {
        return [];
      }
    },
    reseed() {
      seedResources();
      return this.all();
    }
  };

  window.learnHub.progress = {
    get: getProgress,
    save: saveProgress,
    addPoints,
    gradeCap: getGradeCap,
    createTeam() {
      const code = generateTeamCode();
      ensureTeamEntry(code);
      const progress = getProgress();
      progress.teamCode = code;
      saveProgress(progress);
      return code;
    },
    joinTeam(code) {
      if (!code) return null;
      const normalized = code.trim().toUpperCase();
      if (!readTeams()[normalized]) return null;
      const progress = getProgress();
      progress.teamCode = normalized;
      saveProgress(progress);
      return normalized;
    },
    teamPoints(code) {
      return getTeamPointsValue(code);
    },
    teamCode() {
      return getProgress().teamCode;
    }
  };

  window.learnHub.user = getUser() || { grade: 1 };
  // Theme helpers optional (used by theme toggle buttons)
  window.learnHub.theme = {
    get() { return window.localStorage.getItem('learnhubTheme') || 'light'; },
    set(theme) {
      window.localStorage.setItem('learnhubTheme', theme);
      const isDark = theme === 'dark';
      document.body.classList.toggle('theme-dark', isDark);
      document.documentElement.classList.toggle('theme-dark', isDark);
      document.querySelectorAll('[data-theme-toggle] i').forEach((icon) => (icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon'));
    },
    apply() {
      const t = this.get();
      this.set(t);
    },
    toggle() {
      this.set(this.get() === 'dark' ? 'light' : 'dark');
    }
  };
  window.learnHub.generatorRegistry = {
    math: mathGenerators,
    reading: readingGenerators
  };

  window.learnHub.ai = window.learnHub.ai || {
    endpoint: window.localStorage.getItem('learnhubOllamaEndpoint') || DEFAULT_AI_ENDPOINT,
    model: window.localStorage.getItem('learnhubOllamaModel') || DEFAULT_AI_MODEL
  };

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  // Login flow removed – all pages are now accessible without authentication.

  window.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme and wire toggles
    window.learnHub?.theme?.apply?.();
    document.querySelectorAll('[data-theme-toggle]')?.forEach((btn) => btn.addEventListener('click', () => window.learnHub?.theme?.toggle?.()));
    document.querySelectorAll('[data-nav-toggle]').forEach((toggle) => {
      const navbar = toggle.closest('.navbar');
      const links = navbar?.querySelector('.nav-links');
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', (!expanded).toString());
        links?.classList.toggle('is-open', !expanded);
      });
    });
    document.querySelectorAll('.nav-links a').forEach((navLink) => {
      navLink.addEventListener('click', () => {
        const navbar = navLink.closest('.navbar');
        const toggle = navbar?.querySelector('[data-nav-toggle]');
        const links = navbar?.querySelector('.nav-links');
        if (toggle && links) {
          toggle.setAttribute('aria-expanded', 'false');
          links.classList.remove('is-open');
        }
      });
    });
  });
})();

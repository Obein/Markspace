/**
 * Syntax Token Types matching Lezer classHighlighter output tags:
 * 2: Keyword (tok-keyword)
 * 3: String (tok-string)
 * 4: Number (tok-number)
 * 5: Comment (tok-comment)
 * 6: TypeName (tok-typeName)
 * 7: Operator (tok-operator)
 * 8: Meta / Preprocessor / Directive (tok-meta)
 * 9: Property / Function / Builtin (tok-propertyName)
 * 10: Atom / Literal / Constant (tok-atom)
 */
export interface SyntaxToken {
  id: number;
  from: number;
  to: number;
}

export type TokenizerFn = (text: string) => SyntaxToken[];

interface TokenRule {
  type: number;
  regex: RegExp;
}

function createScanner(rules: TokenRule[]): TokenizerFn {
  return (text: string): SyntaxToken[] => {
    const tokens: SyntaxToken[] = [];
    let pos = 0;
    const len = text.length;

    while (pos < len) {
      const sub = text.slice(pos);
      let matched = false;

      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        const m = sub.match(rule.regex);
        if (m && m.index === 0 && m[0].length > 0) {
          const matchLen = m[0].length;
          tokens.push({
            id: rule.type,
            from: pos,
            to: pos + matchLen,
          });
          pos += matchLen;
          matched = true;
          break;
        }
      }

      if (!matched) {
        pos++;
      }
    }

    return tokens;
  };
}

// ── 1. C / C++ ─────────────────────────────────────────────────────────────
export const tokenizeCpp = createScanner([
  { type: 8, regex: /^#\s*(include|define|undef|if|ifdef|ifndef|else|elif|endif|pragma|error|line|warning)\b[^\n]*/ },
  { type: 5, regex: /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/ },
  { type: 3, regex: /^(R"([a-zA-Z0-9_]*)\([\s\S]*?\)\2"|"([^"\\]|\\.)*"|'([^'\\]|\\.)*')/ },
  { type: 4, regex: /^(0x[0-9a-fA-F]+(\.[0-9a-fA-F]+)?([pP][+-]?\d+)?[uUlLzZ]*|0b[01]+[uUlL]*|\d+(\.\d+)?([eE][+-]?\d+)?[fFlLuU]*)\b/ },
  { type: 6, regex: /^\b(int|char|short|long|float|double|bool|void|size_t|ssize_t|int8_t|int16_t|int32_t|int64_t|uint8_t|uint16_t|uint32_t|uint64_t|uintptr_t|intptr_t|auto|wchar_t|char8_t|char16_t|char32_t|string|wstring|string_view|vector|map|unordered_map|set|unordered_set|multiset|multimap|deque|list|forward_list|array|queue|priority_queue|stack|pair|tuple|optional|variant|any|shared_ptr|unique_ptr|weak_ptr|atomic|thread|mutex|chrono)\b/ },
  { type: 2, regex: /^\b(if|else|for|while|do|switch|case|default|break|continue|return|goto|struct|class|union|enum|namespace|using|typedef|template|typename|concept|requires|public|protected|private|virtual|override|final|const|constexpr|consteval|constinit|static|inline|explicit|friend|mutable|volatile|try|catch|throw|noexcept|new|delete|nullptr|true|false|this|sizeof|alignas|alignof|decltype|static_assert|co_await|co_yield|co_return)\b/ },
  { type: 7, regex: /^(::|->|\+\+|--|<<=|>>=|<=|>=|==|!=|&&|\|\||<<|>>|\+=|-=|\*=|(?:\/)=|%=|&=|\|=|\^=|[-+*/%&|^!=<>~?])/ },
]);

// ── 2. Java ────────────────────────────────────────────────────────────────
export const tokenizeJava = createScanner([
  { type: 8, regex: /^@[A-Za-z_][A-Za-z0-9_.]*/ },
  { type: 5, regex: /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/ },
  { type: 3, regex: /^("""[\s\S]*?"""|"([^"\\]|\\.)*"|'([^'\\]|\\.)*')/ },
  { type: 4, regex: /^(0x[0-9a-fA-F]+[lL]?|0b[01]+[lL]?|\d+(\.\d+)?([eE][+-]?\d+)?[fFdDlL]?)\b/ },
  { type: 6, regex: /^\b(byte|short|int|long|float|double|char|boolean|void|String|Integer|Long|Double|Float|Boolean|Character|Byte|Short|Object|Class|List|ArrayList|LinkedList|Map|HashMap|LinkedHashMap|TreeMap|Set|HashSet|LinkedHashSet|TreeSet|Optional|Stream|CompletableFuture|Thread|Runnable|Callable|Exception|RuntimeException|Throwable|BigDecimal|BigInteger)\b/ },
  { type: 2, regex: /^\b(public|private|protected|static|final|abstract|synchronized|volatile|transient|native|strictfp|class|interface|enum|record|extends|implements|permits|sealed|non-sealed|import|package|if|else|for|while|do|switch|case|default|break|continue|return|try|catch|finally|throw|throws|new|this|super|instanceof|null|true|false|yield|var|const|goto)\b/ },
  { type: 7, regex: /^(\+\+|--|<=|>=|==|!=|&&|\|\||<<=|>>=|>>>=|<<|>>>|>>|\+=|-=|\*=|(?:\/)=|%=|&=|\|=|\^=|[-+*/%&|^!=<>~?:])/ },
]);

// ── 3. C# ──────────────────────────────────────────────────────────────────
export const tokenizeCSharp = createScanner([
  { type: 8, regex: /^(#\s*(region|endregion|pragma|if|else|elif|endif|define|undef|warning|error|nullable)\b[^\n]*|\[[A-Za-z_][A-Za-z0-9_]*(?:\(.*?\))?\])/ },
  { type: 5, regex: /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/ },
  { type: 3, regex: /^(\$@"([^"]|"")*"|@"[^"]*"|\$?"([^"\\]|\\.)*"|'([^'\\]|\\.)*')/ },
  { type: 4, regex: /^(0x[0-9a-fA-F]+[uUlL]*|0b[01]+[uUlL]*|\d+(\.\d+)?([eE][+-]?\d+)?[fFmMdDuUlL]*)\b/ },
  { type: 6, regex: /^\b(bool|byte|sbyte|char|decimal|double|float|int|uint|nint|nuint|long|ulong|short|ushort|object|string|void|dynamic|var|Task|ValueTask|List|Dictionary|HashSet|Queue|Stack|IEnumerable|ICollection|IList|IDictionary|IReadOnlyList|Action|Func|Predicate|Nullable|Span|ReadOnlySpan|Memory|ReadOnlyMemory)\b/ },
  { type: 2, regex: /^\b(abstract|as|base|break|case|catch|checked|unchecked|class|const|continue|default|delegate|do|else|enum|event|explicit|extern|finally|fixed|for|foreach|goto|if|implicit|in|out|ref|interface|internal|is|lock|namespace|new|operator|override|params|private|protected|public|readonly|record|return|sealed|sizeof|stackalloc|static|struct|switch|this|throw|try|typeof|unsafe|using|virtual|volatile|while|yield|async|await|get|set|init|value|add|remove|when|and|or|not|with|global|nameof|null|true|false)\b/ },
  { type: 7, regex: /^(\?\?=|=>|\?\?|\+\+|--|<=|>=|==|!=|&&|\|\||<<=|>>=|<<|>>|\+=|-=|\*=|(?:\/)=|%=|&=|\|=|\^=|[-+*/%&|^!=<>~?:])/ },
]);

// ── 4. Rust ────────────────────────────────────────────────────────────────
export const tokenizeRust = createScanner([
  { type: 8, regex: /^(#\!\[[\s\S]*?\]|#\[[\s\S]*?\]|\b(println|eprintln|print|eprint|format|vec|panic|assert|assert_eq|assert_ne|debug_assert|cfg|todo|unimplemented|unreachable|macro_rules)!)/ },
  { type: 5, regex: /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/ },
  { type: 3, regex: /^(r#"[^"]*"#|r"[^"]*"|b"([^"\\]|\\.)*"|b'([^'\\]|\\.)*'|"([^"\\]|\\.)*"|'([^'\\]|\\.)*')/ },
  { type: 10, regex: /^'([a-z_][a-z0-9_]*)\b/ }, // Lifetime
  { type: 4, regex: /^(0x[0-9a-fA-F_]+[uif0-9]*|0b[01_]+[uif0-9]*|0o[0-7_]+[uif0-9]*|\d[\d_]*(\.[\d_]+)?([eE][+-]?\d+)?[uif0-9]*)\b/ },
  { type: 6, regex: /^\b(i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str|String|Option|Some|None|Result|Ok|Err|Vec|Box|Rc|Arc|RefCell|Cell|Mutex|RwLock|HashMap|HashSet|BTreeMap|BTreeSet|Pin|Future|Send|Sync|Clone|Copy|Debug|Default|Display|Drop|Eq|PartialEq|Ord|PartialOrd|Iterator|Into|From|AsRef|Self|self)\b/ },
  { type: 2, regex: /^\b(as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|static|struct|super|trait|true|type|unsafe|use|where|while)\b/ },
  { type: 7, regex: /^(::|->|=>|\.\.=?|\+\+|--|<=|>=|==|!=|&&|\|\||<<=|>>=|<<|>>|\+=|-=|\*=|(?:\/)=|%=|&=|\|=|\^=|[-+*/%&|^!=<>~?:])/ },
]);

// ── 5. R ───────────────────────────────────────────────────────────────────
export const tokenizeR = createScanner([
  { type: 5, regex: /^#[^\n]*/ },
  { type: 3, regex: /^("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/ },
  { type: 4, regex: /^(0x[0-9a-fA-F]+[iL]?|\d+(\.\d+)?([eE][+-]?\d+)?[iL]?)\b/ },
  { type: 10, regex: /^\b(TRUE|FALSE|NULL|NA|NA_integer_|NA_real_|NA_complex_|NA_character_|Inf|NaN)\b/ },
  { type: 6, regex: /^\b(numeric|integer|complex|character|logical|raw|list|vector|matrix|array|factor|data\.frame|tibble|ts|table)\b/ },
  { type: 2, regex: /^\b(function|if|else|repeat|while|for|in|next|break|return|library|require|switch|invisible)\b/ },
  { type: 7, regex: /^(<<-|->>|<-|->|%\w*%|%in%|%\*%|%%|%\/%|::|:::|\$|@|~|\+\+|--|<=|>=|==|!=|&&|\|\||[-+*/%&|^!=<>?:])/ },
]);

// ── 6. Visual Basic ────────────────────────────────────────────────────────
export const tokenizeVisualBasic = createScanner([
  { type: 5, regex: /^('[^\n]*|\bREM\b[^\n]*)/i },
  { type: 3, regex: /^"([^"\n]|"")*"/ },
  { type: 4, regex: /^(&H[0-9a-fA-F]+|&O[0-7]+|&B[01]+|\d+(\.\d+)?([eE][+-]?\d+)?[%&!#@]?)\b/i },
  { type: 6, regex: /^\b(Integer|Long|Short|Byte|Single|Double|Decimal|Boolean|Char|String|Object|Date|Variant|UInt16|UInt32|UInt64|SByte|IntPtr|UIntPtr)\b/i },
  { type: 2, regex: /^\b(Dim|As|Sub|Function|End|If|Then|Else|ElseIf|For|To|Step|Next|Each|In|While|Wend|Do|Loop|Until|Select|Case|With|Exit|Return|New|Nothing|True|False|Me|MyBase|MyClass|Class|Module|Structure|Interface|Enum|Public|Private|Protected|Friend|Static|Shared|ReadOnly|WriteOnly|Overridable|Overrides|Imports|Namespace|Try|Catch|Finally|Throw|Set|Get|Property|ByVal|ByRef|Optional|ParamArray|Const|Call|On|Error|Resume|GoTo|And|Or|Not|Xor|Mod|Is|IsNot|Like|TypeOf|AddressOf)\b/i },
  { type: 7, regex: /^(<=|>=|<>|:=|\+=|-=|\*=|(?:\/)=|\\=|\^=|&=|[-+*/\\^&=<>])/ },
]);

// ── 7. Pascal / Delphi ─────────────────────────────────────────────────────
export const tokenizePascal = createScanner([
  { type: 5, regex: /^(\/\/[^\n]*|\{[\s\S]*?\}|\(\*[\s\S]*?\*\))/ },
  { type: 3, regex: /^'([^'\n]|'')*'/ },
  { type: 4, regex: /^(\$[0-9a-fA-F]+|%[01]+|&[0-7]+|\d+(\.\d+)?([eE][+-]?\d+)?)\b/i },
  { type: 6, regex: /^\b(integer|cardinal|shortint|smallint|longint|int64|byte|word|longword|qword|real|single|double|extended|comp|currency|boolean|bytebool|wordbool|longbool|char|ansichar|widechar|string|ansistring|widestring|unicodestring|pointer|text|variant|file|set|array|record|class|object|interface)\b/i },
  { type: 2, regex: /^\b(program|unit|interface|implementation|uses|var|const|type|procedure|function|constructor|destructor|begin|end|if|then|else|case|of|for|to|downto|do|while|repeat|until|with|try|except|finally|raise|nil|true|false|not|and|or|xor|shl|shr|div|mod|in|is|as|inherited|property|published|public|protected|private|override|virtual|abstract|forward|stdcall|cdecl|pascal|safecall|inline|operator|finalization|initialization|absolute)\b/i },
  { type: 7, regex: /^(:=|\.\.|<=|>=|<>|[-+*/=<>@^])/ },
]);

// ── 8. Scratch / Scratchblocks ─────────────────────────────────────────────
export const tokenizeScratch = createScanner([
  { type: 5, regex: /^(\/\/[^\n]*|#\s*[^\n]*)/ },
  { type: 3, regex: /^("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|\[[^\]\n]*\])/ },
  { type: 4, regex: /^\(\s*-?\d+(\.\d+)?\s*\)/ },
  { type: 10, regex: /^<[^>\n]*>/ }, // Boolean slot <...>
  { type: 8, regex: /^\b(when\s+flag\s+clicked|when\s+this\s+sprite\s+clicked|when\s+I\s+start\s+as\s+a\s+clone|when\s+I\s+receive|when\s+key\s+pressed|when\s+backdrop\s+switches\s+to|broadcast|broadcast\s+and\s+wait|define)\b/i },
  { type: 6, regex: /^\b(move|turn\s+right|turn\s+left|turn\s+cw|turn\s+ccw|go\s+to|glide|point\s+in\s+direction|point\s+towards|change\s+x\s+by|set\s+x\s+to|change\s+y\s+by|set\s+y\s+to|say|think|switch\s+costume\s+to|next\s+costume|switch\s+backdrop\s+to|next\s+backdrop|change\s+size\s+by|set\s+size\s+to|play\s+sound|stop\s+all\s+sounds|ask\s+and\s+wait|reset\s+timer|set\s+drag\s+mode)\b/i },
  { type: 2, regex: /^\b(wait|repeat|forever|if|then|else|wait\s+until|repeat\s+until|stop|create\s+clone\s+of|delete\s+this\s+clone|set\s+to|change\s+by|show\s+variable|hide\s+variable|add\s+to|delete\s+of|delete\s+all\s+of|insert\s+at|replace\s+item\s+of)\b/i },
  { type: 7, regex: /^(\+|-|\*|\/|=|<|>|and|or|not|join|letter\s+of|length\s+of|contains|mod|round)/i },
]);

// ── 9. PHP ─────────────────────────────────────────────────────────────────
export const tokenizePhp = createScanner([
  { type: 8, regex: /^(<\?php|<\?=|\?>)/ },
  { type: 5, regex: /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/ },
  { type: 3, regex: /^("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|<<<([A-Za-z_]+)[\s\S]*?\n\4;?)/ },
  { type: 9, regex: /^\$[a-zA-Z_\x80-\xff][a-zA-Z0-9_\x80-\xff]*/ },
  { type: 4, regex: /^(0x[0-9a-fA-F]+|0b[01]+|\d+(\.\d+)?([eE][+-]?\d+)?)\b/ },
  { type: 6, regex: /^\b(int|float|string|bool|array|object|callable|iterable|void|never|mixed|null|false|true|self|parent|static)\b/i },
  { type: 2, regex: /^\b(abstract|and|as|break|case|catch|class|clone|const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|enum|eval|exit|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|new|or|print|private|protected|public|readonly|require|require_once|return|static|switch|throw|trait|try|unset|use|var|while|xor|yield)\b/i },
  { type: 7, regex: /^(->|\?->|::|=>|\?\?=|===|!==|\?\?|<=|>=|==|!=|<=>|\+\+|--|\+=|-=|\*=|(?:\/)=|\.=|[-+*/%.&|^!=<>?:])/ },
]);

// ── 10. Go ─────────────────────────────────────────────────────────────────
export const tokenizeGo = createScanner([
  { type: 5, regex: /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/ },
  { type: 3, regex: /^(`[^`]*`|"([^"\\]|\\.)*"|'([^'\\]|\\.)*')/ },
  { type: 4, regex: /^(0x[0-9a-fA-F_]+|0b[01_]+|0o[0-7_]+|\d[\d_]*(\.[\d_]+)?([eE][+-]?\d+)?i?)\b/ },
  { type: 6, regex: /^\b(bool|byte|complex64|complex128|error|float32|float64|int|int8|int16|int32|int64|rune|string|uint|uint8|uint16|uint32|uint64|uintptr|any|comparable|nil|true|false|iota)\b/ },
  { type: 9, regex: /^\b(append|cap|close|complex|copy|delete|imag|len|make|new|panic|print|println|real|recover|clear|min|max)\b/ },
  { type: 2, regex: /^\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/ },
  { type: 7, regex: /^(:=|<-|\.\.\.|\+\+|--|<=|>=|==|!=|&&|\|\||<<=|>>=|\&^=|\&^|<<|>>|\+=|-=|\*=|(?:\/)=|%=|&=|\|=|\^=|[-+*/%&|^!=<>?:])/ },
]);

// ── 11. Fortran ────────────────────────────────────────────────────────────
export const tokenizeFortran = createScanner([
  { type: 5, regex: /^(![^\n]*|^[Cc*][^\n]*)/ },
  { type: 3, regex: /^("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/ },
  { type: 4, regex: /^(\b\d+(\.\d+)?([eEdD][+-]?\d+)?(_\w+)?\b|B'[01]+'|O'[0-7]+'|Z'[0-9a-fA-F]+')/i },
  { type: 10, regex: /^\b(\.true\.|\.false\.|\.eq\.|\.ne\.|\.lt\.|\.le\.|\.gt\.|\.ge\.|\.not\.|\.and\.|\.or\.|\.eqv\.|\.neqv\.)\b/i },
  { type: 6, regex: /^\b(integer|real|complex|character|logical|double\s+precision|type|class)\b/i },
  { type: 2, regex: /^\b(program|end\s+program|module|end\s+module|subroutine|end\s+subroutine|function|end\s+function|interface|end\s+interface|use|only|implicit|none|contains|intent|in|out|inout|dimension|allocatable|pointer|target|parameter|public|private|save|pure|elemental|recursive|allocate|deallocate|nullify|call|return|if|then|else|else\s*if|endif|end\s*if|select\s+case|case|case\s+default|end\s+select|do|while|end\s*do|enddo|exit|cycle|where|elsewhere|end\s*where|forall|end\s*forall|write|read|print|format|open|close|inquire|stop|block|end\s*block)\b/i },
  { type: 7, regex: /^(::|=>|\/\/|\*\*|<=|>=|==|\/=|[-+*/=<>])/ },
]);

// ── 12. Assembly (x86, ARM, RISC-V, NASM, GAS) ─────────────────────────────
export const tokenizeAssembly = createScanner([
  { type: 5, regex: /^(;[^\n]*|#[^\n]*|\/\/[^\n]*|\/\*[\s\S]*?\*\/)/ },
  { type: 8, regex: /^(\.[a-zA-Z_][a-zA-Z0-9_]*|\b(SECTION|SEGMENT|GLOBAL|GLOBL|EXTERN|EQU|ORG|BITS|USE16|USE32|USE64|DB|DW|DD|DQ|DT|RESB|RESW|RESD|RESQ)\b)/i },
  { type: 3, regex: /^("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/ },
  { type: 4, regex: /^(0x[0-9a-fA-F]+|[0-9a-fA-F]+h|0b[01]+|[01]+b|\$[0-9a-fA-F]+|#[0-9a-fA-F]+|-?\d+)\b/i },
  { type: 6, regex: /^\b(rax|rbx|rcx|rdx|rsi|rdi|rbp|rsp|r[8-9]|r1[0-5]|eax|ebx|ecx|edx|esi|edi|ebp|esp|r[8-9]d|r1[0-5]d|ax|bx|cx|dx|si|di|bp|sp|al|bl|cl|dl|ah|bh|ch|dh|r[8-9]b|r1[0-5]b|cs|ds|ss|es|fs|gs|rip|eip|ip|flags|eflags|rflags|xmm\d+|ymm\d+|zmm\d+|x[0-9]|x[1-2][0-9]|x3[0-1]|w[0-9]|w[1-2][0-9]|w3[0-1]|sp|lr|pc|xzr|wzr|r[0-9]|r1[0-5]|cpsr|spsr|v\d+|q\d+|d\d+|s\d+|zero|ra|gp|tp|t[0-6]|s[0-9]|s1[0-1]|a[0-7]|f[0-9]|f[1-2][0-9]|f3[0-1]|ft[0-9]|ft1[0-1]|fs[0-9]|fs1[0-1]|fa[0-7]|byte\s+ptr|word\s+ptr|dword\s+ptr|qword\s+ptr)\b/i },
  { type: 9, regex: /^[a-zA-Z_.][a-zA-Z0-9_$.]*:/ }, // Labels
  { type: 2, regex: /^\b(mov|movzx|movsx|lea|push|pop|pushf|popf|add|sub|mul|imul|div|idiv|inc|dec|neg|and|or|xor|not|shl|shr|sal|sar|rol|ror|cmp|test|jmp|je|jne|jz|jnz|jg|jge|jl|jle|ja|jae|jb|jbe|call|ret|syscall|sysenter|int|nop|hlt|clc|stc|cld|std|cli|sti|cmov[a-z]+|set[a-z]+|rep|repe|repne|movsb|movsw|movsd|movsq|ldr|str|ldp|stp|movz|movk|movn|adr|adrp|b|bl|blr|bx|cbz|cbnz|tbz|tbnz|svc|eret|wfi|wfe|lui|auipc|jal|jalr|beq|bne|blt|bge|bltu|bgeu|lb|lh|lw|ld|lbu|lhu|lwu|sb|sh|sw|sd|addi|slti|sltiu|xori|ori|andi|slli|srli|srai|ecall|ebreak)\b/i },
  { type: 7, regex: /^([+\-*/%&|^!=<>~?:,\[\]])/ },
]);

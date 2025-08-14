import { describe, test, expect } from 'bun:test';
import { cleanJSXText } from './cleanJSXText.js';

describe('cleanJSXText', () => {
  test('cleans simple JSX text content', () => {
    const input = '<div>Hello World</div>';
    const expected = '<div>           </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('preserves whitespace and line breaks', () => {
    const input = '<div>Hello   World\n  Next line</div>';
    const expected = '<div>             \n           </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles nested tags', () => {
    const input = '<div>Outer text<span>Inner text</span>More outer</div>';
    const expected = '<div>          <span>          </span>          </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles self-closing tags', () => {
    const input = '<div>Text before<br/>Text after</div>';
    const expected = '<div>           <br/>          </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles apostrophes in text', () => {
    const input = "<div>Don't worry about it</div>";
    const expected = '<div>                    </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles quotes in text', () => {
    const input = '<div>He said "Hello World"</div>';
    const expected = '<div>                     </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles special characters', () => {
    const input = '<div>@#$%^&*()_+-=[]|\\:";\'.,/</div>';
    const expected = '<div>                        </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('does not modify tag attributes', () => {
    const input =
      '<div className="test" data-value="some\'thing">Text content</div>';
    const expected =
      '<div className="test" data-value="some\'thing">            </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('does not modify JavaScript code in curly braces', () => {
    const input = '<div>Text before{someVariable}Text after</div>';
    const expected = '<div>           {someVariable}          </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles multiline JSX', () => {
    const input = `<div>
      First line
      Second line with 'apostrophe'
      Third line
    </div>`;
    const expected = `<div>
                
                                   
                
    </div>`;
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles empty tags', () => {
    const input = '<div></div>';
    const expected = '<div></div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles tags with only whitespace', () => {
    const input = '<div>   \n  \t  </div>';
    const expected = '<div>   \n     </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles complex combination with apostrophes and quotes', () => {
    const input = `<div>Don't say "I can't" when you're coding</div>`;
    const expected = '<div>                                      </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles HTML entities', () => {
    const input = '<div>&lt;script&gt;alert("test")&lt;/script&gt;</div>';
    const expected = '<div>                                          </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles unicode characters', () => {
    const input = '<div>Привет мир! 🌍 ✨</div>';
    const expected = '<div>                </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles mixed content with JavaScript expressions', () => {
    const input = '<div>Before {variable.property} after {another} end</div>';
    const expected =
      '<div>       {variable.property}       {another}    </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles regex patterns in text', () => {
    const input = '<div>Pattern: /\\D+/g and /.*/</div>';
    const expected = '<div>                        </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles backslashes', () => {
    const input = '<div>Path: C:\\Users\\test\\file.txt</div>';
    const expected = '<div>                            </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles complex nesting', () => {
    const input = `<div>
      Outer text with 'apostrophe'
      <span data-test="value">
        Inner text "with quotes"
        <p>Deep nesting don't break</p>
      </span>
      More outer text
    </div>`;
    const expected = `<div>
                                  
      <span data-test="value">
                                
        <p>                        </p>
      </span>
                     
    </div>`;
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('does not modify code without JSX', () => {
    const input = `const test = "string with apostrophe's";`;
    const expected = `const test = "string with apostrophe's";`;
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles React fragments', () => {
    const input = '<>Fragment content with "quotes"</>';
    const expected = '<>                              </>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles comments in text (as text, not as code)', () => {
    const input = '<div>// This is not a comment but text</div>';
    const expected = '<div>                                 </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles CSS-like text (should not modify braces content)', () => {
    const input = '<div>.class { color: red; }</div>';
    const expected = '<div>       { color: red; }</div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles JSON-like text (should not modify braces content)', () => {
    const input = '<div>{"key": "value", "array": [1, 2, 3]}</div>';
    const expected = '<div>{"key": "value", "array": [1, 2, 3]}</div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles escaped characters', () => {
    const input = '<div>Line 1\\nLine 2\\tTabbed</div>';
    const expected = '<div>                      </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles numbers and math expressions', () => {
    const input = '<div>2 + 2 = 4, π ≈ 3.14159</div>';
    const expected = '<div>                      </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles email and URL in text', () => {
    const input = '<div>Contact: user@example.com or https://test.com</div>';
    const expected = '<div>                                             </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('preserves structure with multiple spaces and tabs', () => {
    const input = '<div>Text\t\twith\n\nmultiple   spaces</div>';
    const expected = '<div>          \n\n                 </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles edge cases with empty lines', () => {
    const input = '<div>\n\n\n</div>';
    const expected = '<div>\n\n\n</div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles very long text', () => {
    const longText = 'A'.repeat(1000);
    const input = `<div>${longText}</div>`;
    const expected = `<div>${' '.repeat(1000)}</div>`;
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles text between tags with curly braces inside', () => {
    const input = '<div>Before{expr}Middle{another}After</div>';
    const expected = '<div>      {expr}      {another}     </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles mixed JSX expressions and text', () => {
    const input = '<p>Hello {name}, you have {count} messages!</p>';
    const expected = '<p>      {name}           {count}          </p>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles function calls in JSX', () => {
    const input = '<div>Result: {calculate(a, b)} items</div>';
    const expected = '<div>        {calculate(a, b)}      </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles object access in JSX', () => {
    const input = '<span>{user.name} - {user.email}</span>';
    const expected = '<span>{user.name}   {user.email}</span>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles array methods in JSX', () => {
    const input = '<ul>{items.map(item => <li>{item}</li>)}</ul>';
    const expected = '<ul>{items.map(item => <li>{item}</li> }</ul>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles conditional rendering', () => {
    const input = '<div>{isVisible && <span>Visible text</span>}</div>';
    const expected = '<div>{isVisible && <span>            </span>}</div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles ternary operators', () => {
    const input = '<div>{isActive ? "Active" : "Inactive"}</div>';
    const expected = '<div>{isActive ? "Active" : "Inactive"}</div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles string templates in JSX', () => {
    const input = '<div>{`Hello ${name}, welcome!`}</div>';
    const expected = '<div>{`Hello ${name}, welcome!`}</div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('cleans only plain text, preserves everything else', () => {
    const input = '<div>Plain text {expr} more text {another} final</div>';
    const expected = '<div>           {expr}           {another}      </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles regex with apostrophes and comments', () => {
    const input = `<div>test</div>
    const regex = /\\D+/g;
    // comment with apostrophe's
    <span>more text</span>`;
    const expected = `<div>    </div>
                         
                                
    <span>         </span>`;
    expect(cleanJSXText(input)).toBe(expected);
  });

  // Edge cases - only those that work correctly with the current implementation
  test('handles malformed HTML with missing closing tags', () => {
    const input = '<div>Unclosed tag content<span>nested content';
    const expected = '<div>                    <span>nested content';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles tags with angle brackets in text (regex matches < and >)', () => {
    const input = '<div>Math: 2 < 3 > 1 and 5 < 10</div>';
    const expected = '<div>        < 3 >         < 10</div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles multiple JSX expressions in one tag', () => {
    const input = '<div>{expr1}{expr2}{expr3}text{expr4}more{expr5}</div>';
    const expected = '<div>{expr1}{expr2}{expr3}    {expr4}    {expr5}</div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles deeply nested braces', () => {
    const input = '<div>{obj.prop[func({nested: {deep: value}})]}text</div>';
    const expected = '<div>{obj.prop[func({nested: {deep: value}})]}    </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles text with regex-like patterns', () => {
    const input = '<div>Pattern /test[0-9]+/g and another /.*/i</div>';
    const expected = '<div>                                       </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles XML-style self-closing tags', () => {
    const input = '<div>Before<img src="test"/>After<br></br>End</div>';
    const expected = '<div>      <img src="test"/>     <br></br>   </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles CDATA-like sections', () => {
    const input = '<div><![CDATA[Special content with <>&]]></div>';
    const expected = '<div><![CDATA[Special content with <>    </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles comments that look like JSX (cleans text inside tags)', () => {
    const input = '<div><!-- <span>comment</span> -->text content</div>';
    const expected = '<div><!-- <span>       </span>                </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles base64 encoded content', () => {
    const input = '<div>data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA=</div>';
    const expected =
      '<div>                                               </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles SQL-like syntax in text', () => {
    const input =
      '<div>SELECT * FROM users WHERE id = 1 AND name = "test"</div>';
    const expected =
      '<div>                                                  </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles markdown-like syntax', () => {
    const input = '<div># Header **bold** *italic* [link](url) `code`</div>';
    const expected = '<div>                                             </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles emoji sequences and zero-width characters', () => {
    const input =
      '<div>👨‍👩‍👧‍👦 family emoji and invisible\u200B\u200C\u200D chars</div>';
    const expected =
      '<div>                                               </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles very long lines with mixed content', () => {
    const longText =
      'This is a very long line with lots of text that contains apostrophes, "quotes", and special characters like @#$%^&*()! '.repeat(
        10
      );
    const input = `<div>${longText}</div>`;
    const expected = `<div>${' '.repeat(longText.length)}</div>`;
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles script tag content (text inside script tags gets cleaned)', () => {
    const input = '<div><script>alert("test")</script>text</div>';
    const expected = '<div><script>             </script>    </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles style tag content', () => {
    const input = '<div><style>.class { color: red; }</style>text</div>';
    const expected = '<div><style>       { color: red; }</style>    </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles nested JSX with complex expressions', () => {
    const input =
      '<div>{users.map(user => <span key={user.id}>{user.name}</span>)}text</div>';
    const expected =
      '<div>{users.map(user => <span key={user.id}>{user.name}</span> }    </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles JSX with spread operators', () => {
    const input = '<div>{...props}text{...rest}</div>';
    const expected = '<div>{...props}    {...rest}</div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles HTML entities mixed with regular text', () => {
    const input = '<div>&amp; &lt; &gt; &quot; &#39; regular text &nbsp;</div>';
    const expected =
      '<div>                                                </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles numeric character references', () => {
    const input = '<div>&#8364; &#8482; &#169; regular text</div>';
    const expected = '<div>                                   </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles mixed RTL and LTR text', () => {
    const input = '<div>English العربية עברית русский text</div>';
    const expected = '<div>                                  </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles SVG-like tags with text content', () => {
    const input = '<svg><text>SVG text content</text>other text</svg>';
    const expected = '<svg><text>                </text>          </svg>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles MathML-like tags', () => {
    const input = '<math><mi>x</mi><mo>=</mo><mn>42</mn>text</math>';
    const expected = '<math><mi> </mi><mo> </mo><mn>  </mn>    </math>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles web components with custom tags', () => {
    const input = '<my-component>Custom element text</my-component>';
    const expected = '<my-component>                   </my-component>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles tags with namespaces', () => {
    const input = '<ns:tag>Namespaced content</ns:tag>';
    const expected = '<ns:tag>                  </ns:tag>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles extremely nested tags', () => {
    const input =
      '<div><span><p><strong><em><code>deeply nested text</code></em></strong></p></span></div>';
    const expected =
      '<div><span><p><strong><em><code>                  </code></em></strong></p></span></div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles mixed content with various quotes', () => {
    const input =
      '<div>"double" \'single\' `backtick` «guillemets» "curly quotes"</div>';
    const expected =
      '<div>                                                        </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles content with control characters', () => {
    const input = '<div>Text with\ttab\nand\rnewlines\fand\vvertical tab</div>';
    const expected = '<div>             \n                             </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles JSX fragments with text', () => {
    const input = '<React.Fragment>Fragment text content</React.Fragment>';
    const expected = '<React.Fragment>                     </React.Fragment>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles text mixed with JSX expressions (complex JSX preserved as-is)', () => {
    const input =
      '<div>Text before {complex && <span>nested {variable.prop} more</span>} and "quotes" final</div>';
    const expected =
      '<div>            {complex && <span>       {variable.prop}     </span>}                   </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles pathological cases with many nested expressions', () => {
    const input = '<div>A{1}B{2}C{3}D{4}E{5}F</div>';
    const expected = '<div> {1} {2} {3} {4} {5} </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles empty JSX expressions with text around', () => {
    const input = '<div>before{}middle{/* comment */}after</div>';
    const expected = '<div>      {}                          </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('handles mixed JavaScript constructs in JSX', () => {
    const input = '<div>{value ?? "default"}{user?.name}text</div>';
    const expected = '<div>{value ?? "default"}{user?.name}    </div>';
    expect(cleanJSXText(input)).toBe(expected);
  });

  test('snapshot: handles maximum complexity with all edge cases', () => {
    const input = `<div className="container" data-test='value "with" quotes'>
      Super complex "text" with 'apostrophes' and апострофы!
      {/* Complex JSX comment */}
      <span>{users?.filter(u => u.active)?.map((user, idx) => 
        <Fragment key={user.id}>
          {user.name || "Unknown"} - {user.email?.toLowerCase()} 
          <p>Profile: {user.profile && 
            <strong>
              Bio: {user.bio || "No bio available"}
              {user.tags?.join(", ")}
            </strong>
          }</p>
          {idx < users.length - 1 && <hr/>}
        </Fragment>
      )}</span>
      
      <!-- HTML comment with <weird> "syntax" and 'quotes' -->
      
      Text with unicode: 🚀 ⭐ 💯 αβγ אבג العربية русский 中文
      
      <script type="text/javascript">
        const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g;
        alert("Don't break the parser!");
        /* Multi-line comment
           with 'quotes' and "apostrophes" */
      </script>
      
      {async function complexFunc() {
        const data = await fetch(\`/api/users/\${userId}\`);
        const result = data.json();
        return result?.data?.map(item => ({
          ...item,
          processed: true,
          timestamp: Date.now()
        }));
      }}
      
      <style jsx>{\`
        .dynamic-class {
          content: "before text with 'apostrophe'";
          background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+');
          transform: translateX(\${props.offset}px);
        }
        @media (max-width: 768px) {
          .responsive { display: none; }
        }
      \`}</style>
      
      More text between {complexCalculation(x => x ** 2 + Math.sqrt(x))} and stuff
      
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
        <text x="12" y="16" text-anchor="middle">SVG Text Content</text>
      </svg>
      
      {(() => {
        const nestedObj = {
          prop: {
            deepProp: {
              veryDeep: "value with \\"escaped\\" quotes"
            }
          }
        };
        return \`Template with \${nestedObj.prop.deepProp.veryDeep} interpolation\`;
      })()}
      
      <my-custom-element data-complex='{"nested": {"json": true}}'>
        Custom element with "mixed" content and 'apostrophes'
        {customFunction?.(\`complex \${expression}\`) || fallback}
      </my-custom-element>
      
      Final text with &lt;escaped&gt; HTML entities: &amp; &quot; &#39; &nbsp;
      Math symbols: ∑ ∫ √ π ≤ ≥ ≠ α β γ δ ε
      
      {/* Final complex expression */}
      {Promise.all([
        api.fetchUsers(),
        api.fetchRoles()
      ]).then(([users, roles]) => 
        users.map(user => ({
          ...user,
          role: roles.find(r => r.id === user.roleId)?.name || 'Unknown'
        }))
      )}
      
      <![CDATA[
        Some CDATA content with <weird> "markup" and 'quotes'
        Can contain anything: @#$%^&*()_+-={}[]|\\:";'<>?,./ 
      ]]>
      
      Very final text before closing
    </div>`;

    expect(cleanJSXText(input)).toMatchInlineSnapshot(`
      "<div className="container" data-test='value "with" quotes'>
                                                                  
                                       
            <span>{users?.filter(u => u.active)?.map((user, idx) => 
              <Fragment key={user.id}>
                {user.name || "Unknown"}   {user.email?.toLowerCase()} 
                <p>         {user.profile && 
                  <strong>
                         {user.bio || "No bio available"}
                    {user.tags?.join(", ")}
                  </strong>
                }</p>
                {idx < users.length - 1 && <hr/>}
              </Fragment>
             }</span>
            
            <!-- HTML comment with <weird>                          
            
                                                                 
            
            <script type="text/javascript">
                                                                       {2,}   
                                               
                                   
                                                   
            </script>
            
            {async function complexFunc() {
              const data = await fetch(\`/api/users/\${userId}\`);
              const result = data.json();
              return result?.data?.map(item => ({
                ...item,
                processed: true,
                timestamp: Date.now()
              }));
            }}
            
            <style jsx>{\`
              .dynamic-class {
                content: "before text with 'apostrophe'";
                background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+');
                transform: translateX(\${props.offset}px);
              }
              @media (max-width: 768px) {
                .responsive { display: none; }
              }
            \`}</style>
            
                              {complexCalculation(x => x ** 2 + Math.sqrt(x))}          
            
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              <text x="12" y="16" text-anchor="middle">                </text>
            </svg>
            
            {(() => {
              const nestedObj = {
                prop: {
                  deepProp: {
                    veryDeep: "value with \\"escaped\\" quotes"
                  }
                }
              };
              return \`Template with \${nestedObj.prop.deepProp.veryDeep} interpolation\`;
            })()}
            
            <my-custom-element data-complex='{"nested": {"json": true}}'>
                                                                   
              {customFunction?.(\`complex \${expression}\`) || fallback}
            </my-custom-element>
            
                                                                                    
                                                 
            
                                            
            {Promise.all([
              api.fetchUsers(),
              api.fetchRoles()
            ]).then(([users, roles]) => 
              users.map(user => ({
                ...user,
                role: roles.find(r => r.id === user.roleId)?.name || 'Unknown'
              }))
            )}
            
            <![CDATA[
              Some CDATA content with <weird>                      
                                                 {}        <>     
               
            
                                          
          </div>"
    `);
  });
});

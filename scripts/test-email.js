'use strict';
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator['throw'](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done
                    ? resolve(result.value)
                    : adopt(result.value).then(fulfilled, rejected);
            }
            step(
                (generator = generator.apply(thisArg, _arguments || [])).next(),
            );
        });
    };
var __generator =
    (this && this.__generator) ||
    function (thisArg, body) {
        var _ = {
                label: 0,
                sent: function () {
                    if (t[0] & 1) throw t[1];
                    return t[1];
                },
                trys: [],
                ops: [],
            },
            f,
            y,
            t,
            g = Object.create(
                (typeof Iterator === 'function' ? Iterator : Object).prototype,
            );
        return (
            (g.next = verb(0)),
            (g['throw'] = verb(1)),
            (g['return'] = verb(2)),
            typeof Symbol === 'function' &&
                (g[Symbol.iterator] = function () {
                    return this;
                }),
            g
        );
        function verb(n) {
            return function (v) {
                return step([n, v]);
            };
        }
        function step(op) {
            if (f) throw new TypeError('Generator is already executing.');
            while ((g && ((g = 0), op[0] && (_ = 0)), _))
                try {
                    if (
                        ((f = 1),
                        y &&
                            (t =
                                op[0] & 2
                                    ? y['return']
                                    : op[0]
                                      ? y['throw'] ||
                                        ((t = y['return']) && t.call(y), 0)
                                      : y.next) &&
                            !(t = t.call(y, op[1])).done)
                    )
                        return t;
                    if (((y = 0), t)) op = [op[0] & 2, t.value];
                    switch (op[0]) {
                        case 0:
                        case 1:
                            t = op;
                            break;
                        case 4:
                            _.label++;
                            return { value: op[1], done: false };
                        case 5:
                            _.label++;
                            y = op[1];
                            op = [0];
                            continue;
                        case 7:
                            op = _.ops.pop();
                            _.trys.pop();
                            continue;
                        default:
                            if (
                                !((t = _.trys),
                                (t = t.length > 0 && t[t.length - 1])) &&
                                (op[0] === 6 || op[0] === 2)
                            ) {
                                _ = 0;
                                continue;
                            }
                            if (
                                op[0] === 3 &&
                                (!t || (op[1] > t[0] && op[1] < t[3]))
                            ) {
                                _.label = op[1];
                                break;
                            }
                            if (op[0] === 6 && _.label < t[1]) {
                                _.label = t[1];
                                t = op;
                                break;
                            }
                            if (t && _.label < t[2]) {
                                _.label = t[2];
                                _.ops.push(op);
                                break;
                            }
                            if (t[2]) _.ops.pop();
                            _.trys.pop();
                            continue;
                    }
                    op = body.call(thisArg, _);
                } catch (e) {
                    op = [6, e];
                    y = 0;
                } finally {
                    f = t = 0;
                }
            if (op[0] & 5) throw op[1];
            return { value: op[0] ? op[1] : void 0, done: true };
        }
    };
Object.defineProperty(exports, '__esModule', { value: true });
var email_1 = require('@/lib/email');
// Test email function
function testEmail() {
    return __awaiter(this, void 0, void 0, function () {
        var testEmailData, result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🧪 Testing email functionality...');
                    testEmailData = {
                        to: 'ranjan@xcelerator.co.in',
                        subject: 'Email Test - TiE Communities Platform',
                        html: '\n    <!DOCTYPE html>\n    <html>\n    <head>\n        <meta charset="UTF-8">\n        <meta name="viewport" content="width=device-width, initial-scale=1.0">\n        <title>Email Test</title>\n        <style>\n            body { \n                font-family: \'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif; \n                line-height: 1.6; \n                color: #333; \n                margin: 0; \n                padding: 0; \n                background-color: #f4f4f4; \n            }\n            .container { \n                max-width: 600px; \n                margin: 20px auto; \n                background-color: #ffffff; \n                box-shadow: 0 0 10px rgba(0,0,0,0.1);\n                border-radius: 8px;\n                overflow: hidden;\n            }\n            .header { \n                text-align: center; \n                padding: 30px 20px; \n                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n                color: white; \n            }\n            .content { \n                padding: 30px 20px; \n                text-align: center;\n            }\n            .test-badge {\n                display: inline-block;\n                background: #28a745;\n                color: white;\n                padding: 10px 20px;\n                border-radius: 25px;\n                font-weight: bold;\n                margin: 20px 0;\n                font-size: 18px;\n            }\n            .info-box {\n                background: #e8f4fd;\n                padding: 20px;\n                border-radius: 8px;\n                margin: 20px 0;\n                border-left: 4px solid #667eea;\n            }\n            .footer { \n                text-align: center; \n                padding: 20px;\n                background-color: #f8f9fa;\n                color: #6c757d; \n                font-size: 14px; \n            }\n            .emoji {\n                font-size: 24px;\n                margin: 10px;\n            }\n        </style>\n    </head>\n    <body>\n        <div class="container">\n            <div class="header">\n                <h1 style="margin: 0; font-size: 28px;">\uD83E\uDDEA Email System Test</h1>\n                <p style="margin: 10px 0 0 0; opacity: 0.9;">TiE Communities Platform</p>\n            </div>\n            \n            <div class="content">\n                <div class="emoji">\u2705</div>\n                <div class="test-badge">EMAIL TEST SUCCESSFUL!</div>\n                \n                <h2 style="color: #2c3e50; margin-top: 30px;">Email Configuration Working</h2>\n                \n                <div class="info-box">\n                    <h3 style="margin-top: 0; color: #2c3e50;">Test Details:</h3>\n                    <p><strong>Date:</strong> '.concat(
                            new Date().toLocaleString(),
                            '</p>\n                    <p><strong>Recipient:</strong> ranjan@xcelerator.co.in</p>\n                    <p><strong>System:</strong> TiE Communities Platform</p>\n                    <p><strong>Status:</strong> Email delivery system is operational</p>\n                </div>\n                \n                <p style="font-size: 18px; color: #495057;">\n                    If you\'re receiving this email, it means the email configuration \n                    is working correctly and ready for user onboarding! \uD83C\uDF89\n                </p>\n                \n                <div style="margin-top: 30px;">\n                    <p style="color: #6c757d;">\n                        <em>This is a test email to verify email functionality.</em>\n                    </p>\n                </div>\n            </div>\n            \n            <div class="footer">\n                <p>This is an automated test message from TiE Communities Platform</p>\n                <p>Email system verification completed successfully</p>\n            </div>\n        </div>\n    </body>\n    </html>\n    ',
                        ),
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    console.log(
                        '\uD83D\uDCE7 Sending test email to: '.concat(
                            testEmailData.to,
                        ),
                    );
                    console.log(
                        '\uD83D\uDCCB Subject: '.concat(testEmailData.subject),
                    );
                    return [4 /*yield*/, (0, email_1.sendEmail)(testEmailData)];
                case 2:
                    result = _a.sent();
                    if (result.success) {
                        console.log('✅ Test email sent successfully!');
                        console.log('📊 Email system is working properly');
                        console.log('🎉 Ready for user onboarding process');
                    } else {
                        console.log('❌ Failed to send test email');
                        console.log('Error:', result.error);
                    }
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    console.log('❌ Error sending test email:', error_1);
                    return [3 /*break*/, 5];
                case 4:
                    console.log('\n🏁 Email test completed');
                    process.exit(0);
                    return [7 /*endfinally*/];
                case 5:
                    return [2 /*return*/];
            }
        });
    });
}
// Run the test
testEmail();

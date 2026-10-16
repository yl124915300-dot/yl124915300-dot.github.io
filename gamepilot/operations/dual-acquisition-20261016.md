# GAMEPILOT_DUAL_ACQUISITION_V1 — 2026-10-16

结论：NO_GO（尚未完成独立玩家使用、报价接受或真实付款闭环）。
执行起点：2026-10-16 17:40:42 Asia/Shanghai（云端系统时间）。
本记录封存时间：2026-10-16 17:48:57 Asia/Shanghai。所有网页/表单操作使用 Work remote cloud browser；未使用用户 Mac。云端 CLI browser-act 未安装，改用已提供的云端浏览器；未安装软件。

## 已执行事件（唯一事件去重）

| Event | 时间 Asia/Shanghai | 动作和证据 | 结果 |
|---|---|---|---|
| GP-ENV-001 | 17:40:42起 | 云端执行器返回UTC时间；云端浏览器实际打开公开计算器 | 云端能力确认 |
| GP-REPO-001 | 17:41至17:43核查窗口 | GitHub连接账号 yl124915300-dot；仓库permissions admin/push true；读取源码 | 可编辑权限已读；后续真实写入证明可写 |
| GP-SELF-001 | 17:41至17:42核查窗口 | 浏览器输入20/12 -> +40 Chips / +480；0/12 -> 0；1.5 -> No result | 3项自测通过；排除用户/交付/收入 |
| GP-HISTORY-001 | 17:41至17:44核查窗口 | issues/2评论为空；当前仓库树无独立Balatro入口；读取现有Awesome目录和既有发件记录 | 不重复投稿；历史触达排除本轮 |
| GP-ISSUE-001 | 17:43:06（GitHub created_at） | https://github.com/yl124915300-dot/yl124915300-dot.github.io/issues/4 | 新增Balatro免费公开问答，非外部获客 |
| GP-PAGE-001 | 17:43至17:47写入及回读窗口 | commit 508977c14cf7bf7d1dcb2059238f9d12fcde70d2；17:47:08云浏览器回读新CTA并点击进入issue/4 | 已部署、匿名可达；保留原有资产 |
| GP-ITCH-001 | 17:41至17:42核查窗口 | dashboard转至itch.io/login，Cloudflare安全验证；仅刷新一次仍相同 | 发布BLOCKED；未解挑战、未尝试绕过 |
| GP-CREATOR-001 | 17:45:51（成功回读记录时间） | https://www.clovertalent.gg/contact；针对Skoottie；成功状态“Thank you! Your submission has been received!” | OUTBOUND_SENT=1；人工送达UNKNOWN；HUMAN_REPLY=0（本轮获证） |
| GP-CREATOR-002 | 17:45:51之后 | https://malf.io/contact/ 已填定向询问；出现reCAPTCHA，自动审批拒绝提交 | 未发送；不计OUTBOUND_SENT；未绕过 |
| GP-PAY-001 | 17:47:08前核查 | PayPal账户首页转至登录页 | 当前无可用登录会话；账户地区、渠道商用收款、提现及流水UNKNOWN |
| GP-INBOX-001 | 封存前 | 当前Clover相关收件搜索0；Balatro issue无独立参与记录 | 不能据此断言所有渠道无人使用 |

时间有明确created_at或显式时间记录时使用秒；其它事件只记录真实工具执行窗口，不编造秒级发送时间。

## 两渠道账本

“0”指本轮已完成且获证事件数为零；UNKNOWN指无法观测。获证0不代表实际总量为0。

| Metric | 应用市场自然搜索 | 创作者推荐 |
|---|---|---|
| LIVE_LISTING | 新应用市场商品0；既有Awesome工具目录1（不冒充市场商品） | 不适用；共同产品页1 |
| ANON_ACCESS_VERIFIED | 计算器及新问答入口YES；itch新商品不适用 | 共同计算器及问答入口YES |
| SEARCH_DISCOVERABILITY | itch UNKNOWN；Awesome README直接目录可见，不等于搜索收录 | UNKNOWN |
| OUTBOUND_SENT | 0 | 1（Clover表单） |
| DELIVERY_CONFIRMED | 0 | UNKNOWN（仅表单接收已确认） |
| HUMAN_REPLY | 0获证 | 0获证 |
| UNIQUE_EXTERNAL_USERS | UNKNOWN，获证0 | UNKNOWN，获证0 |
| COMPLETED_SESSIONS | UNKNOWN，获证0 | UNKNOWN，获证0 |
| QUOTE_ACCEPTED | 0 | 0 |
| CHECKOUTS | 0（本轮未开收费入口） | 0（本轮未开收费入口） |
| VERIFIED_PAID | 0；实际账户流水UNKNOWN | 0；实际账户流水UNKNOWN |
| VERIFIED_NET_REVENUE | 获证US$0；实际净到账UNKNOWN | 获证US$0；实际净到账UNKNOWN |

## 创作者/合作方筛查

受众来源：除Olexa外，下表的MLBA成员/联盟受众由 https://majorleaguebalatro.com/creators 和 https://majorleaguebalatro.com/playoffs 核查；不凭粉丝数推断购买力。商业邮件许可不等于允许DM或公开广告。未用邮件发送。

| 候选 | 受众/联系许可证据 | 状态 |
|---|---|---|
| Skoottie | MLBA成员；https://x.com/Skoottie_ 明示business与clovertalent.gg；https://www.clovertalent.gg/contact 为合作入口 | 定向表单已提交1次；无人工回复 |
| MALF / michaelalfox | MLBA成员；https://malf.io/contact/ 明示sponsorship/business并提供一般询问表单 | 已填未提交；reCAPTCHA及审批阻碍 |
| GothicLordUK | MLBA成员及Balatro入门攻略；https://x.com/GothicLordUK 明示Business contact | X无登录；邮件不使用 |
| Nandre | MLBA成员/解说；https://www.nandre.tv/ 明示Business Email | 公开商业入口为邮件；未发；DM许可未证 |
| FrostPrime | MLBA成员；https://x.com/TheFrostPrime 明示Business Email（检索索引） | 邮件不使用；未发 |
| adef | MLBA成员；https://x.com/adefgames?lang=en 明示business inquiries（检索索引） | 邮件不使用；未发 |
| Rarran | MLBA成员；https://x.com/RarranHS/status/1421768124022599682 明示Business Email（检索索引）；现地址与旧Bluesky信息有差异 | 身份已匹配，地址须现时复核；未发 |
| Major League Balatro | 联盟合作方；https://bsky.app/profile/majorleaguebalatro.bsky.social 明示Business Inquiries（检索索引） | 邮件不使用；DM许可未证；未发 |
| Olexa | https://www.youtube.com/watch?v=Dn7jzSoT52M 真实Balatro视频及Business Email；https://www.youtube.com/watch?v=xl7Wyw7jq9c 同样证明 | 邮件不使用；未发；非全部受众均为Balatro |
| Roffle | MLBA成员；https://x.com/RoffleHS 显示Contact | 一般联系不夸大为商业合作许可；未发 |
| Captain_Domo | MLBA成员；https://x.com/captain_domo?lang=en 当前简介无商业许可；第三方Twitch简介镜像有business但未一手回读 | 许可待核；未发 |
| DrSpectred / Balatro University | MLBA成员；https://ko-fi.com/drspectred 证明创作者身份；商业联系只找到第三方目录 | 许可未核实；未发 |

筛查12名/方；9名/方具有公开商业询问声明的证据（部分仅检索索引、非当前浏览器回读），其中Rarran地址冲突待复核；不能宣称完成10名当前可触达且许可完整的合格合作方。Nik Carter54 = CLOSED_DO_NOT_CONTACT，未访问/接触。既有LatentCat/SpireSage接触不重发、不算Balatro合作方。

## 产品与商业边界

仅手动Blue Joker算术已验证。真实有权使用的Balatro截图输入未获得；截图->识别->建议->下一截图重算 = BLOCKED。本轮未伪造截图、自动识别、玩家输入、最优建议或模型服务。未开发庞大版本。当前算术价值不足以直接证明$4.99收费合理。

共同路径已接通：现有目录或获准推荐 -> 同一计算器 -> 新Balatro问答 -> 手工复核可见输入（待真人参与）。报价/付款段未接通。
免费计算器及免费研究问答。$4.99/次与$7.99/月仅价格假设，无活跃报价、订阅、结账或收费视觉功能。

30%净收入分成仅讨论提案：需先核验合法收付款资格、创作者可收款方式、归因与披露、退款争议及税费；归因可由玩家自愿填写创作者代码，单笔订单去重。净收入拟以真实到账减平台/处理费、退款/拒付及约定税费等明确项目后计算；币种/兑换/结算时间和门槛必须双方另行同意。当前无有效商业协议、佣金应付或可执行付款承诺。

## 平台与收款依据

- https://itch.io/docs/creators/getting-started ：免费账号可创建页面；账号当前发布权限未进入后台核验。
- https://itch.io/docs/creators/quality-guidelines ：真实描述、正确分类、素材齐备、AI使用标注；优先直接上传文件，不以普通外链页冒充完整产品。
- https://itch.io/docs/creators/getting-indexed ：公开发布与搜索收录不同；完整标题搜索是核查方法。本轮没有新商品，不能核查其索引。
- https://itch.io/docs/creators/payments ：Direct-to-you需连接付款商，部分地区PayPal要求Business；Collected模式需税务身份流程，提现至少$5且有等待/审核。未代填或开通。
- https://pep.paypal.com/c2/cshelp/article/what-is-the-difference-between-personal-and-business-accounts%E2%80%AF-help318?locale.x=en_C2 ：中国地区帮助页面提及Personal适用于casual sellers，但不能据此确认本账号地区、商业功能、平台接口或提现合格。当前登录不可用，资格UNKNOWN。
- 其它免费入口：现有Awesome-Balatro工具目录已确认且保留；GameJolt检索未取得普通网页计算器适配当前发布分类的充分官方证据，未把工具伪装成游戏。Nexus/Thunderstore未发布，因当前产物不是游戏内模组。

## 阻碍与唯一首要下一动作

首要下一动作：取得一位独立玩家的自愿真实Balatro局面及使用反馈，优先承接已发Clover询问的自愿回应；未验证玩家价值前不扩功能或承诺收费。
登录/准入限制：itch.io云端人机验证；X无登录；PayPal无登录；MALF人机验证且提交被自动审批拒绝。无付费、垫资、钱包操作、身份/税务填写、账号升级、冷邮件或群发。
本轮目标未完成，不承诺后台持续值守或未来自动跟进。

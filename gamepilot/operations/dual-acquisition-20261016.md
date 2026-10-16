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


---

## GAMEPILOT_FIRST_REAL_PLAYER_V1 — 2026-10-16

结论：**NO_GO。第一位独立玩家参与及反馈未取得；不是需求不存在的证据。**

本轮执行起点：2026-10-16 18:07:30 Asia/Shanghai（UTC 时钟 10:07:30）。
本节观察封存：2026-10-16 18:21:04 Asia/Shanghai；随后仅保存、回读本记录。
48 小时验证范围：2026-10-16 18:07:30 至 2026-10-18 18:07:30。实际只执行上述本次时段，**没有启动后台持续执行、定时获客或未来值守**。

### 执行环境与实际动作

- 当前会话可用的是云端公共网页读取、GitHub/Gmail/Buffer 已连接账号接口。**没有可调用的 ChatGPT Work 远程云浏览器或 Reddit/Steam/Discord 写入接口**；不能沿用前轮云浏览器会话。未调用本地终端、读取/写入用户本地文件、操作 Mac 或本地浏览器。
- GitHub 连接账号 yl124915300-dot 的仓库权限 admin/push 为 true。Issue #4 起始及封存前均为 0 条评论。Gmail 精确范围查询 `after:2026/10/15 ("Clover" OR "Skoottie")` 返回 0 封；只表示本次查询无匹配，人工回复在其它不可观测渠道仍 UNKNOWN。Clover 未重复联系，MALF 未操作。
- Reddit 首次 /new/ 读取返回两个月前缓存，未作近期需求依据；随后公开 /new/?limit=25 及公开 JSON 读到近 1–2 日帖子，逐帖核查内容和已有回复。未利用公开读取作为登录或写入权限。
- 下表列出 5 名不同公开发帖账号的真实近期问题；其中只有第一条确证 0 评论。**并未完成“5 条仍待解决且可正确回答、可写入的合格需求”门槛**。没有为凑数给已有答案的帖子追加推广，也没有推测无法读清的截图数字。
- 通过已连接 Buffer 的 **My organization / yl124915300 Pinterest Business** 尝试可写替代入口。先查近 10 条历史发布，未发现重复 Balatro 邀请；沿用既有 GamePilot board（名称仍为 Slay the Spire 2 Replay Lab，受众适配有限）。
- 在云端内存中生成原创 Blue Joker 算术示例图片，经 GitHub 接口保存为 [blue-joker-free-check.png](https://github.com/yl124915300-dot/yl124915300-dot.github.io/blob/main/gamepilot/community/blue-joker-free-check.png)。未复制游戏画面；非功能开发。资产提交 [b2dc968](https://github.com/yl124915300-dot/yl124915300-dot.github.io/commit/b2dc968b19c683998362b640cefa977fa48b6ce7)，图片 blob `cf16d246318aa1851bb136a335c6561580fc18f7`；API 回读 base64 去空白后与原始生成字节一致。
- **18:19:11.852 Asia/Shanghai**，Buffer 返回新 Pin `status=sent`，`error=null`；随后独立 get_post 回读同一正文、图片、目标链接和公开 Pin URL。[本次 Pin](https://www.pinterest.com/pin/1121396376004137275/)，Buffer post ID `6ad1fa1ebbb9ce09f66b8c12`。这是一条公开算术示例和条件性自愿评论邀请，**不是对真实求助者的定向解答或人工送达确认**。
- Pin 正文披露 AI-assisted research、manual calculator、无自动截图/实时追踪、无收费；20 张→40 Chips、12 Mult 下简化增量 480 明示为示例。没有把公开示例计为独立玩家解决方案。评论邀请带 `If comments are available` 条件，因为本 Pin 的评论开关未能实测。
- 公共网页读取本 Pin、产品页及现有 Google Form 均返回访问错误；**没有匿名端到端验证通过**。Buffer 可确认发布，但不提供 Pinterest 评论交互；没有将它包装为已经打通的反馈闭环。未新增反馈页面或修改既有 CTA。

### REAL_NEED_URLS：逐帖记录

下列时间来自 Reddit 公开 JSON created/created_utc，换算 Asia/Shanghai；评论数为本轮读取快照。公开账号和截图说明不等于独立身份核验，更不等于已参与 GamePilot。

| 发帖时间 Asia/Shanghai | 原帖与问题 | 已有回复及本轮处置 |
|---|---|---|
| 2026-10-15 20:41:05 | [juandigamer990dk — Help me!](https://www.reddit.com/r/BalatroHelp/comments/1x6kkm9/help_me/)：怎样排列 Joker，能否活到下个商店；附公开图片 | [JSON](https://www.reddit.com/r/BalatroHelp/comments/1x6kkm9.json?limit=1) num_comments=0、locked=false。最强待回复候选；图片打开仅返回媒体壳，未读清局面；且没有账号写入工具。未发送。 |
| 2026-10-15 12:30:10 | [dupperings — Is this good joker placement?](https://www.reddit.com/r/BalatroHelp/comments/1x6cbot/is_this_good_joker_placement/)：加 Mult/Chips 放在乘 Mult 前是否通用 | [JSON](https://www.reddit.com/r/BalatroHelp/comments/1x6cbot.json?limit=1) 3 评论；已有阶段和复制目标建议。无已见 OP 结案，但是否仍需帮助 UNKNOWN；不冒充未回答线索。 |
| 2026-10-15 06:36:18 | [dionysxs — should i take bloodstone?](https://www.reddit.com/r/BalatroHelp/comments/1x658qv/should_i_take_bloodstone_and_if_so_what_should_i/)：DNA 或 Triboulet 是否换 Bloodstone；附图 | [JSON](https://www.reddit.com/r/BalatroHelp/comments/1x658qv.json?limit=1) 21 评论，多条明确建议不换 Triboulet；缺少当前完整可读状态。未选作新增推广对象。 |
| 2026-10-14 15:58:10 | [InstanceTop4771 — Do I take the hieroglyph?](https://www.reddit.com/r/BalatroHelp/comments/1x5ld3j/do_i_take_the_hieroglyph/)：当前商店是否买 Hieroglyph；附图 | [JSON](https://www.reddit.com/r/BalatroHelp/comments/1x5ld3j.json?limit=1&raw_json=1) 4 评论，已有肯定建议。是否仍暂停游戏待决 UNKNOWN；不计全新未解需求。 |
| 2026-10-14 08:38:47 | [uenouop — Bean help](https://www.reddit.com/r/BalatroHelp/comments/1x5dk2k/bean_help/)：刚过 e25，应卖 Blueprint 或 Baron 换 Bean 增手牌吗；附图 | [JSON](https://www.reddit.com/r/BalatroHelp/comments/1x5dk2k.json?depth=1&limit=0) 8 评论；玩家已回应经济建议，但关键 Bean 得分判断仍有不确定。完整数值未读清，不给确定卖牌结论。 |

另排除：[How to copy this?](https://www.reddit.com/r/BalatroHelp/comments/1x787vt/how_to_copy_this/) 已有 OP 感谢；[$400 Achievement](https://www.reddit.com/r/BalatroHelp/comments/1x6g0si/what_should_i_do_trying_to_get_the_400_achievement/) 原文编辑为 Solved With Ace Pair；[What do i get rid of?](https://www.reddit.com/r/BalatroHelp/comments/1x5w33u/what_do_i_get_rid_of/) OP 编辑确认该局已死亡；[holiday naneinf](https://www.reddit.com/r/BalatroHelp/comments/1x6hsh3/help_getting_my_first_unneeded_naneinf/) 已感谢并期待下一次机会。均未触达。

### RULES_CHECKED 与渠道可执行性

- [r/BalatroHelp 规则 JSON](https://www.reddit.com/r/BalatroHelp/about/rules.json)：本次返回 `rules=[]`；这不等于管理员对 AI/广告/自动化已明确批准。[sidebar](https://www.reddit.com/r/BalatroHelp/about/sidebar/) 和规则页未取得额外完整许可。没有已连接 Reddit 登录/写入接口，故未发评论或 DM。
- [Reddit Spam](https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam)：当前公开规则禁止重复或未经请求的批量互动，以及助长垃圾内容的工具行为。未群发、未用其它账号绕过。
- [r/balatro 规则](https://www.reddit.com/r/balatro/about/rules/) 未完整展开；[官方社区提醒](https://www.reddit.com/r/balatro/comments/1dt478x/) 有 No AI-generated content 声明。本轮不向该社区发布 AI 评论。
- [Pinterest 当前 Community Guidelines](https://policy.pinterest.com/en/community-guidelines)：禁止误导、垃圾内容及未经批准的自动化；[Pinterest 官方 Buffer partner 页面](https://business.pinterest.com/en-ca/pinterest-business-partners/buffer/) 确认支持用 Buffer 发布。仅通过已连接账号发 1 条原创相关内容。
- [Pinterest 评论规则](https://help.pinterest.com/en/article/comment-on-a-pin)：原生评论支持，但可能关闭；评论只能附 Pinterest 内链。[Buffer 官方说明](https://support.buffer.com/en-us/articles/using-pinterest-with-buffer-PB6dp33lMG) 明示 Pinterest Publishing=Yes、Engagement=No。因此未宣称可通过该连接读取或回复评论，未要求外部图片链接或承诺后台服务。
- [Steam Balatro 讨论区](https://steamcommunity.com/app/2379780/discussions/0/) 明示发帖需登录；当前无云浏览器/Steam 连接，未提交。
- [itch.io HTML5 官方说明](https://itch.io/docs/creators/html5) 明确允许任意 HTML/JS/CSS 项目，可传单 HTML 或 ZIP；需要账号创建项目。/game/new 本轮公共读取错误，且无可用 itch 已登录写入路径。**未发布新商品**，不把普通网页冒充模组，不声称绕过了前轮验证码。
- 无真实玩家确认价值，未触发付费报价门槛。当前无 PayPal 账号会话/交易读取接口；收款、提现资格和实际流水均 UNKNOWN。未使用 Stripe、开结账、要求升级/KYC、冷邮件、电话、投标、付费广告、垫资或出款。

### 本轮指标（不累加前轮 Clover）

| Metric | 本轮获证值 | 未观测部分 |
|---|---|---|
| REAL_NEED_URLS | 5 个不同账号的近期具体问题已记录；另有结案排除 | 5 条完全合格的未解且可写需求门槛未通过；仅 1 条确证 0 评论 |
| RULES_CHECKED | Reddit/目标社区、Pinterest、Steam、itch 官方页面见上 | r/BalatroHelp AI/自推专项许可未证；账号可写不成立 |
| OUTBOUND_SENT | 1 条 Pinterest 公开 Pin；原求助定向评论/DM=0 | 独立玩家看到 UNKNOWN |
| DELIVERY_READBACK | 1 次 Buffer get_post 回读 sent+externalLink；无 error | 匿名页面回读未通过；人工送达 UNKNOWN |
| INDEPENDENT_PLAYER_INPUT | 0 个向 GamePilot 主动提交的获证输入 | Pinterest/Google Form 未完整观测，实际总量 UNKNOWN |
| COMPLETED_USEFUL_SOLUTIONS | 0 个已向独立参与玩家交付的获证个性化方案 | 公开算术示例不计入 |
| HUMAN_REPLY | 0 个本轮获证回复；GitHub #4=0 评论；限定 Gmail 查询=0 | Pinterest 评论及其它渠道 UNKNOWN |
| RETURN_USE | 0 个获证回访/更新局面 | 实际访问/回访 UNKNOWN |
| PRICE_PROPOSED | 0 次真实报价 | 历史 $4.99/$7.99 仅假设，不计报价 |
| QUOTE_ACCEPTED | 0 | 无有效报价 |
| VERIFIED_PAID | 0 笔 | 实际账户流水 UNKNOWN，不声称实际总付款为 0 |
| VERIFIED_NET_REVENUE | 获证 US$0 | 实际净到账 UNKNOWN |

### 阻塞与唯一首要后续动作

**首要后续动作：恢复可调用的 Work 远程云浏览器及用户自有、正常登录且规则允许的玩家社区会话，先核清上面 0 评论候选的截图和当前状态，再在原帖交付一个正确答案并询问反馈。**这比继续扩功能、追加创作者名单或再发计算器宣传更有价值。

可解锁的具体步骤：在有 Work 远程浏览器能力的云端会话中，由用户正常登录 Reddit；如出现验证码由真人完成；先取得目标社区对该类 AI 辅助回复的许可。账号登录不能替代社区许可。当前桌面会话仅让用户登录 Mac 上 Reddit 不会给本任务带来云端写入权限。Pinterest 若用于接收反馈，需要在正常云端登录页核实本 Pin 的评论开关并读取真实评论；Buffer 本身不支持该交互。PayPal 仍须在出现真实价值确认后，再由用户在云端核实合法接收能力。上述步骤均未冒充完成。


---

## GAMEPILOT_MARKETPLACE_CREATOR_REVENUE_V1 — 2026-10-16

**结论：NO_GO。已实际提交并成功部署窄场景产品代码；应用市场发布、3–5位创作者真实触达、首笔真实到账均未完成。**

执行起点：2026-10-16 18:29:40 Asia/Shanghai。下述业务观察封存：2026-10-16 18:39:59 Asia/Shanghai；之后仅保存与回读本节及验证报告。没有启动后台持续执行。

### 本轮授权和环境

- 固定路线：同一个 GamePilot，通过游戏工具市场自然发现与 Balatro 创作者合作分发，再连接真实付费。历史章节里的 Reddit 逐帖服务优先级不作为本轮执行指令。
- 只用了云端工具运行时内存、公共网页读取、GitHub/Gmail连接接口。**未调用本地终端、读取或写入用户本地文件、操作用户 Mac、本地浏览器或桌面。**
- 已检查工具清单，并两次搜索远程云浏览器/itch/PayPal/消息能力。此会话没有可调用的 Work remote cloud browser、itch 发布接口、创作者 DM/表单写入接口或 PayPal认证读取接口；搜索结果未补齐这些能力。未用本地浏览器替代。
- GitHub当前仓库 push/admin=true；main起始为 9b4aabb256dfd13931c88a763e6e286edb28f128。读取现有完整社区页、目录树及原台账；仓库树没有 AGENTS.md。通过带 expected_sha 的非强制更新保留并发修改保护。
- 无支出、付费账号、广告、转账、退款、提现、身份/税务填写、密钥请求或新支付入口。无冷邮件、Reddit评论、Pinterest发帖、公开广告替代触达、Clover重复提交或验证码绕过。

### 实际产物

1. [GamePilot Balatro Hand Coach代码](https://github.com/yl124915300-dot/yl124915300-dot.github.io/blob/854d25dcc818a867398493660e1efdbe95d9bee1/gamepilot/balatro/index.html)；目标产品URL：[同一GamePilot下的Balatro入口](https://yl124915300-dot.github.io/gamepilot/balatro/)。
   - 1–8张手动确认的普通、不重复牌；枚举全部1–5张选择，最多218种，按当前支持条件下的即时分数排序；解释牌型、计分牌、基础Chips与Mult、是否达到剩余目标。
   - 支持手动录入当前牌型基础值、记录自报实际分数、清空建议后手动输入下一状态。不会读游戏、执行游戏动作或自动追踪。
   - **严格不支持Jokers、增强/版本/蜡封、debuff、Boss效果、Plasma Deck、模组、重复牌、消耗牌行动或弃牌/未来抽牌策略。不是完整Balatro智能下一步助手，也不是长线最优策略。**
   - 截图控件只有经用户声明有权使用后的浏览器内预览；须自行输入牌面。**SCREENSHOT_AI = BLOCKED：无模型/API、无真实授权图像测试、无自动状态识别或截图连续指导验证。** 未加入游戏图片、官方图案、Logo或第三方代码。
2. [HTML5 ZIP](https://github.com/yl124915300-dot/yl124915300-dot.github.io/blob/854d25dcc818a867398493660e1efdbe95d9bee1/gamepilot/releases/gamepilot-balatro-v1.zip)：24,507字节；根目录index.html（23,842 UTF-8字节）与README.txt；无密钥、外部脚本或构建依赖。结构和CRC已核查。
3. [原创630×500封面PNG](https://github.com/yl124915300-dot/yl124915300-dot.github.io/blob/854d25dcc818a867398493660e1efdbe95d9bee1/gamepilot/releases/cover-v1.png)：158,108字节，已在云端内存渲染检查。封面为合成算例牌面，不是游戏截图。
4. 程序内可运行的合成演示：AH KH QH JH TH 9C 9D 2S → 218种选择 → AH KH QH JH TH，(100+51)×8=1,208。标记self_test，不计玩家使用或真实截图。
5. [准确英文上架说明与配置](https://github.com/yl124915300-dot/yl124915300-dot.github.io/blob/854d25dcc818a867398493660e1efdbe95d9bee1/gamepilot/releases/itch-listing-v1.txt)、[4份未发送的个性化合作询问与独立链接](https://github.com/yl124915300-dot/yl124915300-dot.github.io/blob/854d25dcc818a867398493660e1efdbe95d9bee1/gamepilot/releases/creator-brief-v1.txt)、[关闭状态的付费试点条款草案](https://github.com/yl124915300-dot/yl124915300-dot.github.io/blob/854d25dcc818a867398493660e1efdbe95d9bee1/gamepilot/releases/paid-pilot-terms-draft.txt)。
6. 原社区页仅加入新入口，原Blue Joker脚本逐字保留；未删除既有页面/问答/历史台账。

### 真实时间与验证证据

| Asia/Shanghai | 实际动作 | 证据与限制 |
|---|---|---|
| 18:29:40起 | 读取源代码、历史台账、当前权限与工具能力 | 仅连接接口及云端内存；历史账号会话未被当成当前权限 |
| 18:32:25 | 运行评分/来源解析31项检查，31通过 | 9类常规牌型、A低顺/不可回绕、kicker、非法输入、升级Pair优先、218组合及来源解析；纯JavaScript，非浏览器/实机/玩家验证 |
| 18:35:41 | 运行3项界面逻辑检查，3通过 | 内存DOM替身：合成演示→建议/收据、重复输入清除结果、下一状态清除；不证明视觉布局、图片选择、剪贴板或真实浏览器端到端 |
| 18:37:27 | 核查ZIP根目录、每文件CRC及中央目录 | 两文件完整；没有上传itch或在平台预览 |
| 18:38:12 | 提交并更新main | [854d25dcc818a867398493660e1efdbe95d9bee1](https://github.com/yl124915300-dot/yl124915300-dot.github.io/commit/854d25dcc818a867398493660e1efdbe95d9bee1)；新源码连接接口回读完全一致 |
| 18:38:14–18:38:53 | Pages自动构建与部署 | [run 38888534477](https://github.com/yl124915300-dot/yl124915300-dot.github.io/actions/runs/38888534477)，completed/success；这是部署证据，不是匿名使用证明 |
| 18:38:49 | ZIP/PNG从GitHub分别回读base64，去空白后与内存原始字节一致 | blob分别 c79f7b275811a2ad18e0efb6ef953e84b4f9a655 / 84393b542640737b199a7869c42b4087f18d3818 |
| 18:38:49 | Gmail精确查询 after:2026/10/15 ("Clover" OR "Skoottie") | 0匹配；不证明所有渠道无人回复；没有发送邮件 |
| 18:39:13 | 原Blue Joker脚本相同及3项回归；4个推广代码解析核查 | 20/12→+40 Chips/+480，0/12→+0，1.5→No result；均内存检查 |
| 截至18:39:41 | 部署后两种公共网页工具分别读取产品页/带参数页/原页面；另读index.html | Pages端均工具访问失败；无法据此判断站点是否故障。**匿名浏览器完整流程UNKNOWN** |
| 18:39:41 | 匿名读取固定提交的raw.githubusercontent.com源码成功 | 源码公开可读；不等于Pages界面运行成功 |
| 截至18:39:41 | itch dashboard与完整标题搜索读取均失败 | 无已发布商品URL；不能确认索引。历史Cloudflare阻挡未在当前浏览器复现 |
| 本轮读取窗口 | PayPal公开账户页转登录；MALF官方联系页可读，GothicLordUK官方Bluesky可读，FrostPrime X 403，Nandre站点不可读 | 公开读取不是登录、DM或提交能力；未送出新询问 |

[验证报告](https://github.com/yl124915300-dot/yl124915300-dot.github.io/blob/main/gamepilot/releases/validation-v1.json)分别标明计算引擎、DOM替身、归因解析、包、部署和匿名验证的证据等级。

### itch上架：资产已保存，未发布

官方HTML5说明允许单文件HTML或带根目录index.html的ZIP；HTML5款项是捐赠。按Tool/HTML项目准确分类，不能伪装游戏副本或Nexus/Thunderstore模组。新版本须在真实浏览器完成预览后再发布；当前没有这个执行面。
- 未创建/上传/发布任何itch商品；没有可交付的商品URL。
- 原创封面、英文说明和ZIP已经GitHub保存并回读；**发布前浏览器QA缺失**，故不将整体上架就绪写成无条件完成。
- 精确阻碍：本会话缺Work云端浏览器/itch写入工具与可核验登录会话；公共dashboard读取错误。需在可用Work云浏览器中正常登录，遇Cloudflare或验证码由真人正常处理；不能绕过。
- 发布后还必须匿名运行演示，并在itch按完整标题检查收录；公开发布与搜索索引分别记账。当前搜索读取失败，SEARCH_INDEXED=UNKNOWN。
- 依据：https://itch.io/docs/creators/html5 、https://itch.io/docs/creators/quality-guidelines 、https://itch.io/docs/creators/getting-indexed 。

### 创作者：新增真实发送0，不把草案当触达

| 创作者 | 当前受众/许可核查 | 唯一链接 | 本轮实际状态 |
|---|---|---|---|
| MALF | MLBA官方名单；https://malf.io/contact/允许一般询问并列商务方式 | ?ref=malf | 有表单入口，当前没有表单执行器；历史reCAPTCHA未绕过；未发送 |
| GothicLordUK | MLBA官方名单；官方Bluesky明确business email | ?ref=gothiclorduk | 邮件不使用；商务DM/表单许可未核实；未发送 |
| FrostPrime | MLBA官方名单；X当前403 | ?ref=frostprime | 当前一手商务DM/表单许可未核实；未发送 |
| Nandre | MLBA官方名单；个人站当前不可读 | ?ref=nandre | 当前一手商务DM/表单许可未核实；未发送 |

共同链接前缀为 https://yl124915300-dot.github.io/gamepilot/balatro/ 。**没有完成“3–5位当前合格且允许非邮件商务联系”的筛选和发送要求**。Skoottie/Clover历史已发送1不计本轮，未重复。
受众依据：https://majorleaguebalatro.com/creators 。只做了与本固定路线有关的定向准备，没有替代为随机玩家服务或泛获客。

归因实测限度：
- 4个URL代码解析均通过；MALF代码随合成演示进入导出packet的链路在DOM替身中通过。
- packet可包含来源代码、所填牌面、建议及自报结果，只有用户自愿交回后运营方才能看到。它可以被转发或修改，不证明来源身份或独立用户。
- 没有接通中央访问采集，不能测ATTRIBUTED_VISITS、跨设备去重、独立完成使用或收入归因。**不能称已验证affiliate tracking或可结算分成**。所有自测排除商业数据。
- 没有承诺创作者费用、可结算分成、利润或保底。

### 免费体验与付费：设计已保存，收费仍关闭

- 免费：普通牌比较、解释及手动下一状态。
- 待验证的US$4.99一次性人工复核方案：一个支持范围内局面及一个后续局面的书面解释；不售未实现的截图AI或连续自动指导。此价格只是草案，没有向客户报价、接受或创建结账。
- 草案要求接受前确定支持范围、实际交付截止时间及退款条件；没有后台人员或未来自动交付承诺。
- PayPal实际账户地区、商业收款能力、限制、提现币种/银行/费用/最低额、可用余额与退款执行能力均UNKNOWN。公开地区帮助不能验证本账户。未升级账户、开支付链接、做测试收款、付款/退款或提现。
- itch HTML5如以后启用付款应准确称捐赠；当前收款资格未核验，保持免费且不开放付款。退款草案不是已核验可执行退款机制。
- 依据：https://itch.io/docs/creators/payments 、https://www.paypal.com/c2/cshelp/article/how-do-i-withdraw-funds-from-my-paypal-account-help394?locale.x=en_C2 。

### 商业指标

“本轮获证0”只表示本轮没有已核验证据，不把不可观测实际总量当成0。自测、源码公开和部署成功均不算获客、独立使用或收入。

| Metric | 本轮证据状态 | 边界 |
|---|---|---|
| PRODUCT_ACTUALLY_WORKS | PARTIAL | 窄场景引擎31检查、界面逻辑3检查、旧算术3检查通过；Pages部署成功；真实浏览器/实机/独立玩家完整使用UNKNOWN |
| SCREENSHOT_AI_VERIFIED | 0；BLOCKED | 无图像模型/API、授权真实图像测试或截图识别证据 |
| PUBLISH_READY_BUNDLE | PARTIAL | 可上传ZIP、封面、英文说明真实存在且已回读；浏览器发布前QA UNKNOWN |
| LIVE_MARKET_LISTING | 本轮新增0 | 未发布itch商品、没有新商品URL；账号后台不可观察 |
| SEARCH_INDEXED | UNKNOWN | 无新商品URL；完整标题搜索读取失败 |
| CREATOR_OUTBOUND_SENT | 本轮0 | 4份UNSENT草案不计发送；历史Clover 1不重算 |
| HUMAN_REPLY | 本轮获证0；全渠道UNKNOWN | Issue #4评论0；限定Clover/Skoottie邮箱查询0；其它渠道未完整观测 |
| ATTRIBUTED_VISITS | UNKNOWN；获证0 | 没有中央访问采集；参数存在不等于流量 |
| UNIQUE_USERS | UNKNOWN；获证0 | 未验证独立用户或去重 |
| COMPLETED_USE | UNKNOWN；独立获证0 | 合成自测排除；自报结果机制尚无独立参与 |
| QUOTE_ACCEPTED | 本轮0 | 草案未向客户发出 |
| CHECKOUT_ACTIVE | 本产品新增0；账户资格UNKNOWN | 没有支付代码/链接/订阅；PayPal认证不可用 |
| VERIFIED_PAID | 0笔；账户实际流水UNKNOWN | 无非测试客户完成付款证据 |
| VERIFIED_NET_REVENUE | 获证US$0；实际净到账UNKNOWN | 无已核验到账、手续费及退款对账 |

**首笔真实客户到账>US$0没有实现。** 本轮剩余必要执行面是Work云端浏览器和相关账号的正常登录/允许写入能力；不能用新增草案、发帖数量、源码提交或自测替代。取得执行面后应先完成真实浏览器QA、itch发布及索引核查，再逐一确认许可并发送3–5位创作者询问；付款资格未核验前保持收费关闭。


---

## GAMEPILOT_FIRECRAWL_CLOUD_PUBLISH_ATTEMPT — 2026-10-16

**结论：NO_GO。Firecrawl 连接和普通抓取已实测可用，Interact 工具已开放，但四次实际交互调用全部被并发上限拒绝；未取得云浏览器会话、人工接管链接、端到端 QA 或 itch 商品。**

本节业务观察封存：2026-10-16 19:12:24 Asia/Shanghai（工具 UTC 11:12:24）。实际读取时钟另含 19:10:16、19:11:40；不为首次调用或用户操作编造秒级时间。保存和回读本节发生在封存后。

### 实际动作及直接返回

| 动作 | 实际证据 | 结果/边界 |
|---|---|---|
| Firecrawl 连接与余额 | firecrawl_credit_usage 成功；首次 remainingCredits=967，planCredits=1000；封存前 remainingCredits=917 | 当前连接有效；未购买、升级或充值。此为共享团队余额快照，50 的差额不能全部归因本任务，实际任务消耗 UNKNOWN；不是现金支出证明 |
| 当前连接工具核验 | 已提供 firecrawl_interact、firecrawl_interact_stop、scrape、credit_usage 等；interact 支持 url 或 scrapeId、prompt 或 node/python/bash code；返回字段声明有 liveUrl/sessionUrl | 不是仅搜索/抓取连接；工具声明不代表运行成功。没有列出当前浏览器会话或队列的专用连接工具 |
| 交互尝试1 | 对 Balatro 产品 URL 调用 interact(prompt) | 原文：You have reached the maximum number of concurrent jobs (2). 无会话ID或URL |
| 产品公开读取 | basic 代理、maxAge=0，scrape 返回 HTTP 200、正确标题及页面文本；scrapeId 01a14468-42f5-7161-9736-5ce41bbab722 | 匿名网页抓取可达已证；没有点击演示、算分、下一状态、图片预览、键盘、剪贴板或下载端到端证据 |
| 交互尝试2 | 使用上述真实 scrapeId 调用 node/Playwright 读取标题及按钮 | 同一并发上限错误；代码没有获证执行 |
| 用户操作 | 用户在本聊天明确回复“已结束闲置会话” | 记录为用户报告；当前工具无法列出会话，未独立验证已关闭哪些会话 |
| 交互尝试3 | 用户回复后，用产品 scrapeId 重试 | 仍为同一并发上限错误 |
| 交互尝试4 | 再从 https://itch.io/dashboard 直接以 URL 模式调用 interact(code)，basic 代理 | 仍为同一并发上限错误；未取得登录接管URL，未读取账号后台 |
| itch 普通抓取 | /dashboard -> https://itch.io/login，HTTP 200，显示用户名/密码及 GitHub 登录入口；scrapeId 01a14469-0186-74fa-8445-fe8d3e077ea7 | 只证明此匿名抓取上下文未登录。用户 itch 账号是否存在、账号发布权限及其它保存会话 UNKNOWN；本次抓取未复现历史 Cloudflare 挑战，不能称挑战已永久解除 |
| 能力发现 | firecrawl_find_tools providers=[firecrawl]，查询当前浏览器会话/队列管理，成功返回 items=[]；requestId 27104aa4-c1a7-483e-b0ab-d447bb85b274 | 此次目录查询没有补齐管理能力；不证明 Firecrawl 产品没有会话管理API |
| 本任务资源清理尝试 | 对本任务 docs 抓取 01a14468-0492-74eb-bf70-93cd4aa6d3f4 与 MALF 抓取 01a14468-f3b8-73b9-8533-fc664104d5c8 调用 interact_stop，均404 | 两者没有可停止的获证交互会话；不将404当成功清理，不猜测/终止其它任务会话 |
| 资产/运营资料 | 通过 GitHub 读取本运营记录、gamepilot/balatro/index.html、gamepilot/releases/itch-listing-v1.txt | 复用现有产品和说明；无新代码、发布包、封面、推广草稿或泛发内容 |
| MALF 原有入口复核 | https://malf.io/contact/ HTTP 200，显示 sponsorship/business 联系说明、一般联系表单、reCAPTCHA requires verification | 没有当前可执行的云交互面；未填写、提交或绕过验证码。新联系回执0；Clover未重复联系 |
| 现有回应入口复核 | GitHub issue #4 comments=[]；Gmail after:2026/10/15 -in:sent -in:drafts ("Clover" OR "Skoottie") 返回0匹配 | 限定入口未见新回应；其它渠道 UNKNOWN。未发送邮件 |

### 产品文档能力与当前可用性分别记账

- Firecrawl 官方文档明确 Interact 是支持的 MCP 路径，能从 URL 开始或继续 scrapeId，Node/Python 内有 Playwright page，代码远程执行；文档支持 interactiveLiveViewUrl 供用户点击、输入及登录接管。**本次连接未成功返回这些URL，Playwright执行及真人接管实测均 UNKNOWN/BLOCKED。**
- 连接 interact 的输出 schema 仅声明 liveUrl/sessionUrl 等字段，未单列官方API的 interactiveLiveViewUrl/CDP字段；工具能否完整透传人工控制URL UNKNOWN，不能把只读观看链接当接管能力。
- **文件上传：UNKNOWN。** 当前工具没有独立的远程浏览器文件上传参数；执行代码是可能路径，但没有运行成功的 setInputFiles、云端取包或 itch 上传证据。官方 Interact/Browser 页面没有在本次检索中提供专门的文件上传承诺，不能以“Playwright预装”替代实际上传验证。
- 官方API有 GET /v2/interact 列举会话，但本连接未暴露对应专用工具；没有获取或请求密钥。当前并发占用来源、用户关闭操作是否作用于同一团队、服务端计数是否滞后均 UNKNOWN。
- 官方速率文档区分并发与每分钟速率；本次只能确认错误原文的并发2上限，不能诊断为未安装、余额不足、账号禁用或 itch 拒绝发布。
- 不操作用户 Mac、本地浏览器、本地终端或本地文件。无安装、付费、广告、付款入口、身份/税务填写、视觉识别销售、验证码解答或安全挑战规避。

依据：
- https://docs.firecrawl.dev/features/browser
- https://docs.firecrawl.dev/features/interact
- https://docs.firecrawl.dev/rate-limits
- https://docs.firecrawl.dev/api-reference/endpoint/browser-list
- https://itch.io/docs/creators/html5
- https://itch.io/docs/creators/quality-guidelines
- https://itch.io/docs/creators/getting-indexed

### 本轮真实业务指标

| Metric | 本轮获证状态 |
|---|---|
| CLOUD_INTERACTION_AVAILABLE | BLOCKED：四次实际调用同一并发上限错误 |
| PRODUCT_ANON_FETCH | YES：产品URL普通抓取HTTP 200；不等于浏览器端到端通过 |
| BROWSER_E2E_QA | 未完成；结果 UNKNOWN |
| FILE_UPLOAD_VERIFIED | UNKNOWN；未上传 |
| HUMAN_LOGIN_TAKEOVER | 未取得可交互链接；实测 UNKNOWN |
| ITCH_AUTHORIZATION | 当前匿名抓取转登录；账号发布权限 UNKNOWN |
| LIVE_MARKET_LISTING | 新增0；商品URL UNKNOWN，未创建/上传/发布 |
| ITCH_ANON_EXPERIENCE | UNKNOWN；无本轮新商品 |
| SEARCH_INDEXED | UNKNOWN；未取得新商品，未把公共规则页当索引证据 |
| CREATOR_OUTBOUND_SENT | 新增0；无新回执；Clover未重复 |
| HUMAN_REPLY | 本轮获证0；其它渠道 UNKNOWN |
| REAL_PLAYERS / COMPLETED_USE | 本轮独立获证0；实际总量 UNKNOWN |
| QUOTE_ACCEPTED / VERIFIED_PAID | 本轮获证0；无真实客户付款证据；账户实际流水 UNKNOWN |
| VERIFIED_NET_REVENUE | 获证 US$0；实际净到账 UNKNOWN |

**首笔非测试客户真实到账 > US$0 未实现。** 下一必要动作仍是让当前 Firecrawl 团队的 Interact 真正返回可用会话。用户已报告关闭闲置会话但接口仍拒绝；无需再次安装、付费升级、给出密钥或在 Mac 登录来冒充解锁。可用会话返回后沿用现有资产，依次完成真实浏览器QA、用户正常远程登录/必要真人验证、免费发布、匿名演示与独立搜索收录核查。


---

## GAMEPILOT_MARKETPLACE_CREATOR_REVENUE_CONTINUATION — 2026-10-16

**本轮结果：补齐“下一状态重新计算”云端浏览器核验；新增 1 次定向商务表单接收。itch.io 仍被正常登录前的 Cloudflare 安全验证阻挡，没有上传、创建或发布商品；首笔真实客户到账 > US$0 尚未实现。**

本节所有事件时间均为 Asia/Shanghai。19:36:10.815 是本轮首个带远端执行时钟的产品快照；此前的续接/新建尝试不补造秒级时间。最后账号观察为 19:40:14.747。仅追加本节，保留此前记录。

### 云端会话、登录与产品实测

- 尝试沿用历史产品 scrapeId `01a14468-42f5-7161-9736-5ce41bbab722`；首次自然语言交互在连接层 50 秒超时。随后两次代码读取均返回 `another execution is in progress`，不能据此判断登录或已完成任何网页动作。该次调用实际返回本轮新浏览器 session `01a1447d-f06c-709b-9bc0-ce4bb922df39`。只停止此本任务新建的卡住会话；停止接口返回 stopped，sessionDurationMs=85000、creditsBilled=10。未终止其它任务会话。
- 从 itch dashboard 合法新建云端会话，session `01a1447f-4871-726e-86c5-0369e60459f0`，续接 scrapeId `01a1447f-47c6-741e-b4a5-f84f9e1ec1e8`。实际 `https://itch.io/dashboard` 转至 `https://itch.io/login`，标题 `Just a moment...`，正文 `Performing security verification`，并说明 Cloudflare 验证。没有输入凭据、点击或破解挑战，也没有将用户“继续”当作已登录证据。
- 已向用户返回工具生成的 interactiveLiveViewUrl 供本人正常接管；含访问令牌的窗口链接不写入公开仓库。此会话按本任务接管需求保留；未声称可永久保留或后台持续值守。
- 19:39:18.581 在本轮云端浏览器中打开用户提供的旧 Hangar 窗口，实际正文为 `This link is unavailable or has expired.`。这说明旧链接当前不可用，不证明旧账号没有登录过。
- 19:38:48.749 再读新 itch 标签仍为登录页与相同 Cloudflare 验证；19:40:14.747 最后读取仍为 `Just a moment...`（此时正文为空、URL带挑战参数）。仍无认证后台、账号身份或发布权限证据。没有上传、保存商品草稿或发布操作。

| Asia/Shanghai | 产品实际操作 | 结果与证据边界 |
|---|---|---|
| 19:36:10.815 | 云端浏览器新标签匿名打开 https://yl124915300-dot.github.io/gamepilot/balatro/ | 标题 GamePilot — Balatro Hand Coach；真实页面及输入/按钮可读。免费、手动普通牌、无 Joker/修饰、无截图 AI、无收费入口的说明仍在页面 |
| 19:36:26 | 点击 Run synthetic demo；填写 observed=1208 后 Record observed result | 页面出现 1208 分推荐及候选表；导出 packet 的 step=1、kind=self_test，history 含 comparison 与 observed_result。observed 值由本次自测输入，不是游戏实测或玩家反馈 |
| 19:36:26 | 点击 Enter next state | hand=""、target="0"、scope=false、observed=""，旧建议清除 |
| 19:36:26.805 | 手动输入 AH AD 2C 3D 4S；target=60；重新勾选支持范围；点击 Compare supported plays | 31 legal selections；Pair AH AD；(10 base Chips + 22 scoring-card Chips) × 2 Mult = 64；页面显示达到目标。packet step=2、kind=self_test、新牌面和目标60，history 新增第二次 comparison；own=false |

**BROWSER_QA=PASS 仅指本任务要求的窄范围核心浏览器流程，最后未核验项现已补齐。** 这些均为合成自测，排除独立玩家、创作者带来的使用、真实截图、AI识别和收入。没有在 itch 上传包后的预览或匿名嵌入运行证据；移动端、真实游戏复现等未由本次检查验证。

### 创作者合作：本轮新增 1 次真实表单接收

本轮选择 Dan Gheesling，使用当前一手机构网站明示的合作联系表单；没有发送邮件、DM、公开评论或广告。无需登录的表单执行不依赖 itch 登录。

- 受众证据：Dan 的 [LocalThunk / Balatro 播客页面](https://www.youtube.com/watch?v=iaIu0PT8n_o) 和其 [官方频道直播列表](https://www.youtube.com/@DanGheesling/streams)；检索结果明确匹配 DanGheesling 与 Balatro。只用于相关性筛选，不推断当前需求、玩家数量或购买能力。
- 当前代理及许可：[GG Talent 官方创作者页](https://www.ggtalentgroup.com/creators) 在本轮云端浏览器显示 DanGheesling；[Contact 页面](https://www.ggtalentgroup.com/contact) 明示可填写合作询问表单。
- GG 首页出现 Fir 的锚点链接，但当前 creators#fir 页面未读到 Fir 本人条目，故没有把 Fir 的当前代理关系当成已确认，也没有以其名义提交。
- 表单显示名使用项目身份 GamePilot Project，Organization 为 GamePilot — independent free prototype；回信地址来自当前已连接 GitHub 账号资料，不猜测或另行采集私人联系方式。公开台账不列出回信地址。
- 19:37:58.798 提交前回读：必填字段均有效，success/failure 均未显示，iframe 列表为空。
- 只点击提交一次。该交互调用随后执行超时，**没有重试提交**。独立回读在 19:38:38.712 观察到跳转至 https://www.ggtalentgroup.com/thank-you ；19:38:48.749 再回读标题 `Thank You | GG Talent Group` 与可见正文 `THANK YOU / We will be in touch soon.`。这是本次提交后的接收回执，不是预先隐藏在 HTML 中的成功文案。
- CREATOR_SENT 新增1：机构表单已接收。是否转交 Dan、Dan 是否阅读、人工回复、测试意愿及合作均 UNKNOWN，没有承诺付费投放、创作者费用或佣金。

本次实际发送正文：

> Hello GG Talent team — this enquiry is specifically for Dan Gheesling. His Balatro coverage and LocalThunk podcast make him a relevant reviewer for a small beginner teaching tool.
>
> GamePilot — Balatro Hand Coach is a free, unofficial, AI-assisted browser prototype. It compares 1–5-card selections from up to eight manually entered ordinary cards, explains the immediate score, and lets the player enter the next state. It supports no Jokers or card modifiers and has no screenshot recognition or automatic game tracking.
>
> Working demo: https://yl124915300-dot.github.io/gamepilot/balatro/?ref=dangheesling
>
> Would Dan be open to trying it and, if useful, discussing an optional educational demonstration for his audience? This is an unpaid, opt-in prototype review request. No fee, commission or placement is promised; payments remain disabled. The optional referral code appears only in voluntary feedback packets, without central visit tracking.
>
> GamePilot project / yl124915300-dot

其它筛查不计触达：GothicLordUK 当前检索仅有商务邮件声明，无已验证允许且可写入的非邮件入口；Haelian 没有找到可核验商务表单/DM；LANCERKUN 官网虽允许商务表单并列 Balatro 为兴趣，但其主要身份为艺术/周边创作者，本轮没有取得相关 Balatro 内容受众证据，未发送。没有为凑数联系弱相关对象。

Skoottie/Clover 历史成功1次保持去重，未重发。Rarran/Fixated 的上一轮错误不计发送，本轮未重试。MALF 的历史 reCAPTCHA 没有绕过或重新提交。上述旧结果来自既有台账及本轮用户接续说明，不冒充本轮重新实测。Nik Carter54 未接触。

### 公开发布、使用、付款与唯一当前上架门槛

| Metric | 本轮截至最后观察的状态 |
|---|---|
| LOGIN_VERIFIED | NO / BLOCKED；新云端会话仍在 itch 登录前 Cloudflare 验证，无认证后台证据 |
| BROWSER_QA | PASS：本轮补齐下一状态重新计算；仅支持范围内的合成浏览器自测 |
| LIVE_ITCH_LISTING | 本轮新增0；未创建/上传/发布，商品 URL UNKNOWN |
| ANON_USE | GitHub Pages 产品 YES（自测）；itch 商品 UNKNOWN；独立玩家使用获证0、实际总量 UNKNOWN |
| SEARCH_INDEXED | UNKNOWN；无本轮商品，未把公开页面、部署或规则文档当搜索收录证据 |
| CREATOR_SENT | 本轮新增1（GG / Dan 定向表单接收）；历史 Clover 1 未重算；人工送达 UNKNOWN |
| HUMAN_REPLY | 新获证0；GitHub issue #4 本轮 comments=[]；邮件及其它渠道未在本轮读取，整体 UNKNOWN |
| VERIFIED_PAID | 新获证0笔；实际账户流水 UNKNOWN，没有访问或操作收款账户 |
| VERIFIED_REVENUE | 获证 US$0；实际净到账 UNKNOWN |

**当前免费 itch 上架的唯一已实测阻碍：用户本人在新云端接管窗口完成 itch.io 的正常安全验证与登录。** 验证后仍需实际核查账号准入、使用现成 ZIP/封面/英文说明免费发布、取得真实商品 URL、匿名运行及独立标题搜索；这些均尚未完成，不能预先承诺会通过。商业终局另外仍缺真实独立客户、接受、交付与到账证据；收款/提现资格仍 UNKNOWN，收费与捐赠保持关闭，itch HTML5 捐赠不描述为订阅。

本轮没有开发产品、制作发布素材或另建报告；业务网页操作仅用 Firecrawl 云端浏览器/检索与已连接 GitHub。没有控制用户 Mac、本地浏览器或本地终端，没有购买、投广告、支付、出款、升级套餐、填写税务身份信息或绕过安全步骤。

补充封存事件：2026-10-16 19:41:28.201 Asia/Shanghai，保存后再次在同一云端 itch 标签回读，仍为 https://itch.io/login、标题 Just a moment...、正文 Performing security verification。LOGIN_VERIFIED 仍为 NO/BLOCKED；已将 itch 标签置前供本人接管，未操作验证控件。首次台账提交 ec09cad12f5714319ff695df462ff1dc6f2c144f 已逐字回读一致，历史前缀完整保留。


---

## GAMEPILOT_ITCH_ACTUAL_EXECUTION_CONTINUATION — 2026-10-16 19:55–20:02 Asia/Shanghai

**结果：itch.io 未发布。原接管窗口失效且原浏览器会话已销毁；新云端会话正常访问真实登录地址后仍停在 Cloudflare 真人验证。新增 1 次 Fixated 接收的 Rarran 定向询问；没有人工回复、独立玩家使用或真实付款证据。首笔客户付款目标未实现。**

本节时区均为 Asia/Shanghai；首个时钟读数 19:55:43。以下秒级时间来自远端浏览器实际执行时钟；只有调用窗口的事件按分钟窗口记录，不倒推秒级动作时间。保留此前台账全文。

### 会话及实际上架动作

| 时间 | 实际动作 / 回读 | 结果 |
|---|---|---|
| 19:55–19:56 | 首次将接管链接内 br 标识用于续接，接口返回 Invalid job ID format；随后读取原台账取得正确 scrapeId | 该次失败不证明原会话过期；无网页发布动作 |
| 19:56:16 | 新云端浏览器打开用户提供的原 Hangar 接管链接 | 正文 This link is unavailable or has expired.，没有 itch 画面 |
| 19:56–19:57 | 使用原台账的正确 scrapeId 01a1447f-47c6-741e-b4a5-f84f9e1ec1e8 续接 | Browser session has been destroyed.；原会话无法续用 |
| 19:56–19:58 | 在本任务新会话正常导航至 https://itch.io/login；自然语言调用连接层超时，未当作导航失败或登录成功 | 后续用代码独立读取当前页面 |
| 19:58:20.150 | 云端读取全部标签，唯一标签 URL 为 https://itch.io/login，标题 Just a moment...，正文 Performing security verification，明确 Cloudflare | LOGIN_VERIFIED=NO/BLOCKED；没有认证后台或账号发布权限证据 |
| 19:58–20:01 | itch 标签保留供用户本人接管；创作者操作使用同一云端浏览器的另一个标签 | 未点击、解答、伪装或绕过安全挑战，未输入登录凭据 |
| 20:01:28.829 | 独立回读 itch 标签 | URL /login；相同 Cloudflare 验证 |
| 20:01:49.871 | 将 itch 标签置前，再读 URL /login、标题 Just a moment...、正文 Performing security verification | 最后观察仍为 NO/BLOCKED；窗口按本次人工接管需要保留，未承诺永久有效或后台持续值守 |

本轮云端续接 scrapeId：01a14491-cacd-738c-ac49-3932332ae187。含令牌的接管/CDP链接只提供给用户，不写入公开仓库。

既有 ZIP、封面和上架说明已定位；说明通过 GitHub 连接器读取，内容 blob 为 82249c025f2fa849c63a6774bd3c0bc351f2e387。未新增代码、发布包、图片或额外方案。由于未通过登录前安全检查，本轮没有创建商品、上传、预览、保存草稿或发布动作；没有商品 URL 可供匿名运行与搜索收录核验。上一轮窄范围浏览器 QA 作为既有证据保留，没有重复计为本轮 QA。

### Rarran / Fixated：拒收后按字段规则修正，最终接收 1 次

当前相关性及许可的一手依据：

- https://majorleaguebalatro.com/creators ：当前页面列有 Rarran、其 Twitch/YouTube 链接与 Balatro 联赛参赛介绍。
- https://x.com/RarranHS ：本轮读取简介明示 Business 联系地址使用 fixated.com 域；只用于机构关系核对，没有发送邮件。
- https://fixated.com/contact ：真实页面 For Brands 标签明示可针对特定创作者提出合作询问，并提供公开表单。未把商务邮件许可扩张为 DM 许可。

| 时间 | 实际动作 / 回读 | 结果 |
|---|---|---|
| 19:58:39.552 | 云浏览器新标签打开 Fixated 公开 contact 页 | 可见 For Talent / For Brands / For Press 选项及表单 |
| 19:59–20:00:00.468 | 两次将 For Brands 当成 button 的点击定位超时；检查实际 DOM，发现控件 role=tab | 无提交；不计已发送 |
| 20:00:08.110 | 正常点击 For Brands tab | 显示特定创作者合作询问说明、Name / Company / Company Website / What are you looking for / Email；无验证码 iframe |
| 20:00:29.574 | 填写并逐字段回读 | 项目身份 GamePilot Project；独立免费原型；回信地址来自已连接 GitHub 账号资料，公开台账不列出地址；均通过浏览器字段校验 |
| 20:00:37.491 | 首次点击提交 | 20:00:37.770 实际表单 POST 返回 HTTP 422，明确 Company 上限 32 字符、Looking for 上限 255 字符；拒收，不计发送 |
| 20:00:45.180 | 独立回读错误页及该次网络响应 | 页面 Something went wrong. Please try again.；确定是字段验证拒收，不是成功 |
| 20:00:59.027 | 按服务端公开返回的长度规则缩短 Company 及请求正文，重新逐字段回读 | Company=GamePilot free prototype；正文 254 字符；没有改变为付费投放或承诺预算 |
| 20:01:06.726 | 正常 UI 再提交修正后的请求 | 20:01:07.566 同一表单接口返回 HTTP 200，正文 success |
| 20:01:28.829 | 独立再次读取页面可见正文 | MESSAGE SENT，并明确已接收消息；这是提交后可见状态，不是隐藏成功模板 |

最终获接收正文：

> For Rarran (MLBA): unpaid, opt-in feedback on GamePilot, a free unofficial AI-assisted Balatro tool. Manual ordinary-card scores; no Jokers/modifiers, screenshot AI or tracking. No sponsorship budget/fees. Demo on company website. Please route to Rarran.

Company Website 为 https://yl124915300-dot.github.io/gamepilot/balatro/ 。没有冒充注册公司，没有承诺费用、佣金、投放、合作或收费资格。没有通过直接调用表单接口发送；记录的是正常 UI 提交产生的实际网络响应。初次 422 拒收后按校验规则纠正，不把两次按钮点击算作两次有效发送。

**CREATOR_SENT 新增 1，仅表示 Fixated 表单已接收；是否转交 Rarran、人工阅读、反馈、推广或合作仍 UNKNOWN。** Clover/Skoottie 与 GG/Dan 未重发；MALF 未提交或操作验证码；未发冷邮件、DM 或群发。历史 Rarran/Fixated 错误不计为历史成功。

### 本轮指标与未完成门槛

| Metric | 本轮获证状态 |
|---|---|
| ORIGINAL_SESSION | 原链接失效；正确原会话续接明确 destroyed |
| LOGIN_VERIFIED | NO / BLOCKED；新会话实际仍为 Cloudflare 真人验证 |
| LIVE_ITCH_LISTING | 新增0；没有商品URL，没有上传或发布 |
| ITCH_ANON_USE | UNKNOWN；无本轮商品 |
| SEARCH_INDEXED | UNKNOWN；无本轮商品，未拿普通网页可达性代替收录 |
| CREATOR_SENT | 新增1：Fixated / Rarran 表单接收；失败的首次提交不计 |
| HUMAN_REPLY | 新获证0；本轮未读收件箱，整体 UNKNOWN |
| INDEPENDENT_USE / QUOTE_ACCEPTED | 新获证0；没有独立玩家输入、接受或交付证据 |
| VERIFIED_PAID | 新获证0笔；实际账户流水 UNKNOWN |
| VERIFIED_REVENUE | 获证 US$0；实际净到账 UNKNOWN |

当前阻碍是**用户本人完成 itch.io 安全验证与正常登录**，不是缺少发布授权：用户已明确授权使用现成资产免费发布。验证与登录完成后，账号准入与发布权限仍需实际核查，不能预先视为通过。无 Joker/修饰、手动计算、无 AI 截图识别的范围保持真实；收费与捐赠未开启。

执行范围偏差：开始读取两份技能说明时误调用了本地终端（只读），违反用户限定，随后已告知并停止。后续业务网页操作仅使用 Firecrawl 云端浏览器/读取与已连接 GitHub；未操作本地浏览器、安装软件、购买或升级服务、投广告、付款、出款、填税务身份资料或绕过验证码。没有新建后台定时任务，没有将任务受理或表单接收冒充上架、成交或收入。


---

## GAMEPILOT_ACQUISITION_ONLY — 2026-10-16 20:24–20:37 Asia/Shanghai

本轮新增 **2 次定向表单接收**，均为有 Balatro 报道的独立游戏媒体团队，明确请求本人试用，并仅在认为有价值时公开推荐/演示。没有新增产品功能或重复核心 QA。以下秒级时间来自云浏览器实际时钟。

| 时间 Asia/Shanghai | 外部入口及实际动作 | 独立回读/结果 |
|---|---|---|
| 20:33:50.017 | [The Indie Informer 联系表单](https://theindieinformer.com/contact/)；针对编辑团队及 Marcus Stewart 的 Balatro 报道；仅点击提交一次 | 20:33:57.238 读到可见 Thank you for your response 与本次完整提交正文；URL 的 contact-form-sent=32325。接收已证，人工阅读/回复/试用/推荐 UNKNOWN |
| 20:36:08.875 | [WayTooManyGames 联系表单](https://waytoomany.games/contact/)；明确面向 Leo Faria / Balatro 作者；仅点击提交一次 | 提交后及 20:36:36.421 独立回读可见 Thank you for your response 与本次完整正文；contact-form-sent=193032。接收已证，人工阅读/回复/试用/推荐 UNKNOWN |

相关性及许可：The Indie Informer 的 [Balatro 移动版报道](https://theindieinformer.com/2024/09/05/balatros-mobile-release-will-tighten-its-grip-on-all-of-us-this-month/) 署名 Marcus Stewart，并链接其 Balatro 评测；站内 Contact 为公开询问表单。WayTooManyGames 的 [Balatro 评测](https://waytoomany.games/2024/02/20/review-balatro/) 署名 Leo Faria；Contact 明示 Inquiries 并允许填写表单。上述内容证明题材相关性，不证明受众人数或购买意愿。原台账未发现两站的既往触达记录。

两次均使用 GamePilot Project 项目身份及已连接账号的回信地址；公开台账不记录地址、带令牌回执链接或浏览器接管令牌。正文如实披露免费、非官方、AI-assisted、手动输入普通牌、无 Joker/修饰、无截图识别或实时跟踪；不承诺广告预算、费用或佣金。具体请求为亲自试用，并在确认有价值时发布一次面向初学者的推荐/演示；同时接受直接回复反馈。演示路径分别为 [Indie Informer](https://yl124915300-dot.github.io/gamepilot/balatro/?ref=indieinformer) 和 [WayTooManyGames](https://yl124915300-dot.github.io/gamepilot/balatro/?ref=waytoomanygames)。ref 仅标签，无中心访问归因证据。

其它执行及限制：
- itch.io 本轮仅一次正常 dashboard 访问，约20:24–20:25转到 login，实际可见 Performing security verification / Cloudflare；HUMAN_REQUIRED。未刷新重试、操作挑战、上传或发布。后续未再核验 itch；无本轮商品 URL。
- 历史 [Awesome Balatro PR #150](https://github.com/jie65535/awesome-balatro/pull/150) 已由维护者合并，原目录仍链接旧 Blue Joker 算术工具；该历史收录不计本轮新推荐。为现有 Hand Coach 准备的一行目录链接更新已保存于既有 fork，commit e3f9112e40c36ed57917729d78f8a5537c6afecd；[公开比较](https://github.com/jie65535/awesome-balatro/compare/main...yl124915300-dot:awesome-balatro:gamepilot-hand-coach-link)。
- 对上游创建 PR 和向原 PR 留言分别被 GitHub 连接器以 403 Resource not accessible by integration 拒绝；云浏览器公开比较页显示 Sign in，未登录。**没有创建新 PR，没有将维护者询问送达**，不计触达。仅目录元数据变更，未改产品代码。
- [GameGrin 联系表单](https://www.gamegrin.com/about-us/contact-us/) 有媒体询问类别，但出现 hCaptcha；停止，未提交。Balatro HQ / BalatroLab 当前有效联系及工具建议入口仅邮件，未发送；GothicLordUK 官网已过期。未用一般产品报错入口冒充商务投稿。
- 本轮起始及20:36查询三家既有机构与本轮两站相关收件，排除发件/草稿及 GitHub 通知后无匹配；20:37读取现有 issue #4 的 comments=[]。这是已检查渠道无新反馈证据，不断言其它渠道总量为0。Clover/Skoottie、GG/Dan、Fixated/Rarran 未重发；MALF、关闭线索未接触。

| Metric | 本轮结果 |
|---|---|
| LIVE_MARKET_LISTING | 新增0；itch未发布，当前 Hand Coach 新目录更新未送达 |
| CREATOR_CONTACT_SENT | 新增2个编辑/作者团队表单接收；不是2名真人确认 |
| HUMAN_REPLY | 新获证0；整体 UNKNOWN |
| CREATOR_RECOMMENDATION_PUBLISHED | 新获证0；整体 UNKNOWN；历史旧工具目录收录单列 |
| EXTERNAL_PLAYER_USE | 新获证0；实际总量 UNKNOWN，无中心追踪 |
| QUOTE_ACCEPTED | 本轮0，未报价 |
| VERIFIED_CUSTOMER_PAYMENT | 新获证0；未读取流水，实际 UNKNOWN |
| VERIFIED_NET_REVENUE | 获证 US$0；实际净到账 UNKNOWN |

FIRST_REAL_REVENUE>US$0 尚未实现。没有开收费入口、操作付款/提现、购买、投广告、预付、发送冷邮件/电话/竞标或绕过验证码。开始读取技能说明时误用一次本地终端（只读），已在对话中告知并停止；之后业务操作仅使用云浏览器及已连接 GitHub/Gmail。未新建后台自动跟进任务。


---

## GAMEPILOT_ACQUISITION_ONLY — 2026-10-16 20:44–20:59 Asia/Shanghai

**目标未完成：没有新增已发布的玩家分发入口或确认真人试用/合作。新增1次创作者表单接收；另1次提交接收状态UNKNOWN，不计成功。**

起始时钟20:44:27，最后业务观察20:58:53；秒级事件取自Firecrawl远端浏览器。只使用Firecrawl云端工具、已连接Gmail/GitHub与时钟；未访问本地文件/Mac终端/本地浏览器，未开发、修改产品或重复QA。

### 真实联系及去重

| 时间 Asia/Shanghai | 入口/对象 | 结果 |
|---|---|---|
| 20:54:09.875点击；20:54:19.675独立回读 | [Gideon’s Gaming联系表单](https://gideonsgaming.com/contact/)；直接运营网站和视频频道的Gaming Gideon | 仅提交一次。提交后URL含contact-form-sent=45211，可见Thank you for your response及本次完整正文，表单隐藏。接收已证；人工阅读/回复/试用/推荐UNKNOWN。 |
| 20:57:06.495点击；20:57:06.521读到Sending... | [Wingsplain联系表单](https://wingsplain.com/contact/)；Jason与Lisa | 仅点击一次。后续云浏览器读取失败，未取得接收回执；发送/接收UNKNOWN，**不计成功且不得盲目重发**。 |

相关性/决策权依据：[Gideon本人Balatro评测及视频](https://gideonsgaming.com/balatro-review/)、[本人运营/联系政策](https://gideonsgaming.com/about-us/)；[Wingsplain百小时评测及讨论](https://wingsplain.com/balatro-review-steam/)、[Jason负责内容/Lisa负责开发编辑](https://wingsplain.com/about/)。原台账和Gmail历史查询未发现两方既往联系。

邀请分别针对Gideon评测中普通牌到Joker规则变化的教学切入点、Wingsplain的百小时体验与早期手牌讨论。均请求本人试用、自主判断初学者价值，只有认为有用才考虑公开短演示/推荐，也接受批评或拒绝。真实披露免费、非官方、AI-assisted、最多8张普通牌手动输入、1–5张牌即时得分，无Joker/修饰/截图识别/自动跟踪；Wingsplain另明确无弃牌/未来回合优化。未要求正面评价、冒充游戏/模组或承诺新功能、费用、佣金、赞助。演示ref分别为gideonsgaming、wingsplain，仅可出现在自愿反馈，没有中心访问计数。未附生成美术。公开台账不保存回信地址、完整带令牌回执URL或浏览器接管信息。

起始及20:58的Gmail相关查询排除发件/草稿/GitHub通知，覆盖原五家与GamePilot，最后增加两家新对象，均无匹配邮件；没有自动回执或人工回复可分类。最后读取[issue #4](https://github.com/yl124915300-dot/yl124915300-dot.github.io/issues/4)，comments=[]。原五家未催促/重发；不可观测渠道仍UNKNOWN。

### 分发入口实际阻碍

- 登录/注册门槛：AlternativeTo官方FAQ、[Alternative.me规则](https://alternative.me/how-to/submit-software/)、MakeItLast实际投稿页、ToolFame实际投稿页、10words、[Browse FAQ](https://browse.fyi/faqs)。未注册或尝试登录。
- [Something For That](https://www.somethingforthat.com/submit)：云浏览器嵌入Airtable明确This form is not accepting responses，需所有者升级；未提交/请求升级。
- [NoSubscription](https://nosubscription.org/submit)：免费通道限开源且需公开repo。仓库根及GamePilot目录树未找到可确认的开源许可证，不把公开源码当OSS许可，未申报。
- [Toolfio](https://toolfio.com/submit)实际要求DR20+与永久反链；[Yo.directory](https://yo.directory/submit)要求登录及永久反链。未添加徽章或进入付费通道。
- [Launching Next](https://www.launchingnext.com/submit/)有Quick Check反垃圾验证，未作答/提交。Toolfolio读取连接失败，未提交。
- [GameJolt说明](https://gamejolt.com/help-docs/creators/add-game)未提供将本独立工具作为游戏发布的充分依据；[Balatro Wiki规则](https://balatrowiki.org/w/Balatro_Wiki:Wiki_rules)排除非官方创作的正文收录并限制自推，均未发布。
- Rogueliker、The Punished Backlog、OldCynic仅找到邮件联系；前两者另有反生成式AI覆盖政策，未联系。未把评论或报错入口当商务投稿。
- itch.io沿用HUMAN_REQUIRED，本轮未访问/刷新/重建会话；未重试历史GitHub 403目录PR/留言。历史Awesome Balatro旧收录不计新增。

### 本轮指标

| Metric | 结果 |
|---|---|
| NEW_LIVE_LISTING_URL | 无，新增0；无新商品/目录URL可做匿名与搜索收录验证 |
| SUBMISSION_ACK | 1：Gideon，标识45211；Wingsplain UNKNOWN不计 |
| CREATOR_NEW_SENT | 1获证；另1次Wingsplain发送/接收UNKNOWN，禁止盲目重发 |
| REAL_HUMAN_REPLY | 新获证0；已查Gmail无匹配，其他渠道UNKNOWN |
| RECOMMENDATION_PUBLISHED | 新获证0；实际总量UNKNOWN |
| INDEPENDENT_PLAYER_USE | 新获证0；实际总量UNKNOWN |
| CHECKOUT_ACTIVE | 本轮新增0，未开启收费/捐赠 |
| VERIFIED_PAID | 新获证0；实际账户流水UNKNOWN |
| VERIFIED_NET_REVENUE | 获证US$0；实际净到账UNKNOWN |

未将接收回执、Sending...、草稿、自测或工具成功计为合作、玩家使用或收入。未访问收款账户、购买/升级服务、投广告、预付、提现、填写KYC、绕过验证码或新建后台自动跟进。首笔收入目标未实现。


---

## GAMEPILOT_40_PERCENT_CREATOR_ACQUISITION — 2026-10-16

**当前唯一有效条件：推广方固定40%，我们保留60%；计算基础为可归因、已实际到账的有效订单净收入。所有历史50%/30%及阶梯分成草案全部废止，不得继续对外发送或执行。历史正文仅保留审计，不构成当前报价。付费结账、可靠归因、合法结算核验并经双方同意前，只有条件式意向，无现时佣金应付、预付、保底或收益保证。**

本节最早独立时钟22:42:24；截至2026-10-16 22:52:25 Asia/Shanghai。网页操作仅使用Firecrawl云端，账号仅使用已连接Gmail/GitHub；未访问Mac、本地浏览器、终端或文件。未开发或修改产品、重复QA、发送冷邮件、购买、投广告、开启收费、转出资金或绕过验证码。

### 协调、收件与去重

- 原引用会话及最近GamePilot/Work状态已读；22:52线程清单仅当前任务active，既有GamePilot任务idle/notLoaded，未见并行出站。未唤醒旧任务；本轮没有旧分成出站。
- 起始Gmail查询覆盖GamePilot、Balatro及Clover/Skoottie、GG/Dan、Fixated/Rarran、The Indie Informer、WayTooManyGames、Gideon、Wingsplain；包括in:anywhere并排除发件/草稿的复查，无上述对象人工新回复。返回项仅GitHub通知，历史SpireSage/LatentCat发件不计；旧目录合并通知不计新合作回复。
- 六家已接收询问均不重发；Wingsplain继续UNKNOWN，未重试；MALF与itch.io均未访问/重试；历史Awesome目录403接口未再尝试。
- 为封存作出的更窄Gmail查询返回FORBIDDEN / RATE_LIMIT_EXCEEDED / PERMISSION_DENIED；未连续重试。因此最后时点新增邮件UNKNOWN，不能声称全天无人回复。22:51–22:52 GitHub issue #4仍comments=[]。
- 原台账及Gmail对The Indie Brew、Bec Lumsden-Keys、Press To Start/Rob去重无既往匹配。未将无匹配当作永远未接触的全渠道证明。

### GP40-BREW-001：新增1次定向表单接收

对象：[The Indie Brew创办人Bec Lumsden-Keys](https://theindiebrew.com.au/about-2/)。本人创办及管理内容的证据来自官方About；其[公开Balatro视频](https://www.youtube.com/watch?v=xjsJnJpHdOk)由本频道发布，正文列Balatro、展示普通牌到Joker机制的讲解。本轮公开读取该视频101 views（不据此推断精准Balatro观众数或购买意愿）。个人决策权依据为创办人/创意负责人身份，不是本人已确认合作。

官方About明确保持独立游戏报道免费、无偿；同时开放品牌广告/赞助询问，[品牌资料](https://theindiebrew.com.au/wp-content/uploads/2025/04/Ad-Sponsor-Packages.pdf)与独立报道分开。本次通过[官方公开联系表单](https://theindiebrew.com.au/contact-us/)提出工具品牌/可选转介询问，明确尊重免费报道政策，不购买编辑报道；仅在其品牌政策允许时讨论未来分成，否则不追求该部分。没有订购广告、接受任何付费套餐或承诺费用。

| Asia/Shanghai | 实际动作与回读 | 状态 |
|---|---|---|
| 22:50:47 | 项目身份GamePilot Project、已连接账号回信地址、个性化正文逐字段回读；表单checkValidity=true，无验证iframe | 准备完成，不计发送 |
| 22:51:06 | 仅点击一次Send | 正常UI提交；没有直接调用表单接口 |
| 22:51:10 | 同次UI产生的POST https://theindiebrew.com.au/wp-admin/admin-ajax.php 返回HTTP200；正文success=true，message=Your submission was successful.；页面同样可见成功状态 | CREATOR_SENT=1；外部唯一回执ID未返回/UNKNOWN |
| 22:51:25 | 独立再次读取同一页面，成功状态仍可见，message输入框已清空 | 接收已证；真人阅读、同意、试用、推荐均UNKNOWN |

实际发送正文如下（回信地址不写入公开账本）：

> Hello Bec — your PC Game Pass indie-gems video opens with Balatro's ordinary hands before explaining Joker depth. That makes you a relevant person to judge a small beginner practice tool.
> 
> I run GamePilot, a free, unofficial, AI-assisted browser prototype: manually enter up to eight ordinary cards, compare 1–5-card plays and their immediate scores, then enter the next state. No Jokers, modifiers, screenshot recognition, automatic game tracking or full-run optimisation.
> Demo: https://yl124915300-dot.github.io/gamepilot/balatro/?ref=theindiebrew
> 
> Would you personally try it and, only if useful, voluntarily show it to your players? Critical feedback or declining is welcome; no positive review is required.
> 
> I respect your free, unbiased editorial-coverage policy. This is a tool-brand/referral enquiry, not an offer to buy editorial coverage. Separately, only if your brand policy permits it, would you consider a future fixed referral share: 40% to you and 60% to us of attributable, actually received valid-order net revenue (after agreed platform/payment fees and refunds)?
> 
> This is conditional interest only. The current version is free; paid checkout is unverified, central attribution is absent and lawful commission settlement is not ready. No commission is currently accruing or payable. Any arrangement starts only after paid checkout, reliable attribution and lawful settlement are verified and mutually agreed. No upfront fee or guaranteed earnings.
> 
> If referral arrangements conflict with your policy, we will not pursue that part. Independent trial feedback is still welcome.
> GamePilot Project / yl124915300-dot

本次演示ref仅是可出现在自愿反馈packet中的代码；没有中央访问追踪或已验证销售归因，不能以URL访问或表单接收计算使用/合作。

### 其它必要筛查及商业门槛

- [Press To Start / Rob Grover](https://presstostart.co.uk/blog/why-press-start-on-balatro/)有本人Balatro文章，网站明确使用联盟链接并开放合作；[本人社区](https://www.skool.com/press-to-start-launchpad-7566)确认其创办人身份。但[公开联系表单](https://presstostart.co.uk/contact-us/)实际必填Phone，无已有授权项目电话号码，未填造、绕过校验或提交，CONTACT_BLOCKED_REQUIRED_PHONE。不计CREATOR_SENT。
- [Video Chums规则](https://videochums.com/about)明确拒绝利益交换式刊登；[Higher Plain Games](https://higherplaingames.com/contact/)明确不接收生成式AI代码/素材项目，均排除、未联系。GameStrategyHub官方联系页仅商务邮件；TCGS联系页HTTP522。均未出站，不计合格合作或发送。
- 公开产品抓取HTTP200；只复核能力说明，未重复核心QA。GitHub当前产品源码blob 9d701b2f7261b9177e14cb05176153721e133cc7 第25行明确paid pilot关闭、无支付链接/创作者付款、无服务器归因；第151行packet仅自报。当前免费版无已开启结账，未更改。
- 22:51:56仅一次正常只读访问PayPal账户首页，在本Firecrawl会话转至paypal.com/signin。未输入凭据、查看真实账户/流水、升级或开启收费。账号地区、商用收款、提现及创作者合法结算资格UNKNOWN；不能用新云浏览器的匿名状态断言用户所有会话均未登录。
- itch.io既有Cloudflare HUMAN_REQUIRED继续保留，本轮未访问/刷新/新建itch会话。没有新增市场上架或公开推荐。首笔真实客户净收入>US$0未实现。

### 本轮指标

0仅表示本轮获证事件为0；UNKNOWN表示实际状态/总量未能观测。表单成功不等于合作。

| Metric | 本轮获证及未知边界 |
|---|---|
| CREATOR_SENT | 新增1（The Indie Brew）；累计已接收7家；Wingsplain UNKNOWN另列排除；只有新增1使用本轮40%条件 |
| REAL_HUMAN_REPLY | 获证0；起始查询无人工匹配，最后Gmail限流后的新入站UNKNOWN |
| TRIAL_ACCEPTED | 获证0；实际UNKNOWN |
| PUBLIC_RECOMMENDATION_URL | 新增0；当前合作推荐URL UNKNOWN；历史旧工具目录收录不重算 |
| EXTERNAL_PLAYER_USE | UNKNOWN；获证0，无中心追踪 |
| ATTRIBUTED_SALES | UNKNOWN；获证0，无可靠中央归因 |
| VERIFIED_PAID | 获证0笔；实际账户流水UNKNOWN |
| VERIFIED_NET_REVENUE | 获证US$0；实际净到账UNKNOWN |

下一有效推进条件：Bec本人回复并接受一次独立试用/自愿演示；任何分成正式启动还须付费交付、结账、可靠归因及合法结算具备。未创建后台自动跟进或声称持续值守。


---

## GAMEPILOT_REVENUE_EXECUTION_V2 — 2026-10-16 23:36–23:44 Asia/Shanghai

**首笔到账目标未达成。支付后台未能回读；用户两次确认已在所给云端页面登录，但同一浏览器会话的实时URL/DOM及一次正常支付设置导航均仍为登录页。记录为 HUMAN_REQUIRED / SESSION_READBACK_CONFLICT，不把用户确认当作支付资格实测通过，也不据此断言用户未登录其它可见页面。**

执行起点23:36:39；本节业务观察截至23:44:56（时钟UTC+8）；23:43:13与23:44:11为云浏览器实测时间。只使用Firecrawl云端、已连接GitHub/Gmail及UTC时钟；未读取/操作Mac、本地终端、文件或浏览器。未开发、改动免费产品、重复核心QA、付费、提现、预付、升级账号、填写KYC、处理凭据或绕过安全验证。

| 时间/窗口 | 真实动作、证据与结果 |
|---|---|
| 23:36–23:38 | 读取原台账与引用会话并去重。Payhip首次云端打开超时，未取得状态；页面读取发现 /login 为404，随后依据官方帮助中的真实支付设置入口正常访问，转至 /auth/login?redirect=…settings/payments。没有注册、恢复密码或提交登录。 |
| 23:36–23:38 | Gmail距历史22:52限流已超过约45分钟，只作一次限定查询：当日、排除发件/草稿/GitHub通知，覆盖GamePilot及七家/Wingsplain。成功返回 emails=[]、无下一页；本轮不再查询。只证明此查询无匹配，不能推断所有入站无人回复。 |
| 截至23:41:40 | GitHub issue #4 的 comments=[]；release目录回读确认现成ZIP仍在，大小24507 bytes、blob c79f7b275811a2ad18e0efb6ef953e84b4f9a655。未上传商店或验证付费订单交付。 |
| 23:38–23:44 | 提供本次云端接管入口供用户正常登录；用户两次确认已登录/已看到该云端后台。回读核对会话标识与原会话相同；23:43:13实时URL/title/DOM仍为Login - Payhip，无Products/Account/Marketing导航。 |
| 23:44:11 | 为核查用户已登录后会话是否生效，在同一会话仅正常打开一次 https://payhip.com/settings/payments ，再次实际转至登录页。未刷新或重新提交登录。下一步请求用户提供其当前已登录Payhip后台的非敏感地址栏URL以定位回读差异；不用重复提供凭据。 |
| 23:40–23:42 | 独立PayPal云会话创建被服务并发上限(2)拒绝；等其它调用结束后仅一次顺序重试仍相同，停止。复用Payhip的第二标签方案被工具限制拒绝，未导航。**本轮未到达PayPal账户，账户地区、类型、接款和流水均UNKNOWN。** |
| 23:39–23:41 | 有限检索Balatro/游戏工具目录未找到新增可证的相关自助投稿入口；结果含其它工具repo、计算器自身反馈入口、模组wiki、开发资源及泛AI目录，均未误投。没有新上架/投稿；itch既有HUMAN_REQUIRED未再触发，历史Awesome目录403接口未重试。 |

### 已核清的交易规则（公开规则不等于本账号通过）

- [Payhip支付接入](https://help.payhip.com/article/64-connecting-your-paypal-account)：列明部分地区允许Personal，其余支持地区要求Business；若实际账户地区为中国大陆，不能把Personal视为可接入。本账号地区及连接/接款状态未读到。后台实际卖家准入、支付方式、商品/退款设置与流水均UNKNOWN。
- [Payhip数字产品](https://help.payhip.com/article/59-adding-a-digital-product)支持ZIP、0+自愿定价及100%优惠券测试；[收款前提](https://help.payhip.com/article/173-how-do-i-get-paid)要求先连接支付处理商；[平台条款](https://payhip.com/terms)要求具备内容分发权并遵守支付商规则。上述能力只属规则核验，未创建商品或测试订单；免费网页版同功能及现有能力边界仍须如实展示。
- [退款规则](https://help.payhip.com/article/281-refund-request)：卖家管理自己的退款政策，Payhip不持款或直接退款。本账号现有退款条件未能回读，未擅自声称不退款或确定退款期限。
- [Payhip Affiliates](https://help.payhip.com/article/95-affiliates)：30天、末次触点归因；按销售额百分比设置，卖家自行付款，平台提供月报。不能把销售额40%直接宣称为有效到账净收入40%。本轮未启用或创建可提现佣金。唯一有效比例仍是**创作者40%／GamePilot60%，按可归因且已到账有效订单净收入**；扣费、退款、单订单去重、结算时点/方式须在真实能力具备后与伙伴明确同意。
- 免费替代路径仅核得**条件式候选Gumroad＋自有PayPal Connect**：[价格](https://gumroad.com/pricing)无月费、直接销售平台费10%+$0.50；[结账接入规则](https://gumroad.com/help/article/275-paypal-connect)要求先配置收款资料，并验证自有PayPal整合，PayPal订单可直接进入连接账户；[收款规则](https://gumroad.com/help/article/13-getting-paid)允许无受限Personal或Business接收平台PayPal付款，但普通平台余额付款门槛US$100且有等待/审查，银行支持表未列中国大陆。**没有Gumroad账号/收款资格实测或活跃商品证据，不把工行卡、OKX钱包、公开规则或平台余额当作可用收款路径/已到账。** 未注册新账号或迁移产品。

### 九项验收（0仅指本轮获证0）

| Metric | 本轮获证及未知边界 |
|---|---|
| PAYMENT_ACCOUNT_VERIFIED | 0；UNKNOWN / SESSION_READBACK_CONFLICT，未读到商用接款资格 |
| REAL_CHECKOUT_URL | 未取得；本轮未创建付费商品或结账链接 |
| ORDER_FULFILLMENT_VERIFIED | 0；未做商店订单交付测试，现成ZIP存在不等于订单交付 |
| AFFILIATE_LINK_VERIFIED | 0；未配置/生成经验证的销售联盟链接 |
| CREATOR_HUMAN_REPLY | 0；限定Gmail查询无匹配，所有渠道实际总量UNKNOWN |
| ACTUAL_PUBLIC_RECOMMENDATION | 新增0；实际UNKNOWN；历史旧工具目录收录不重计 |
| INDEPENDENT_PLAYER_USE | 获证0；实际UNKNOWN，无中央统计 |
| PAID_ORDERS_VERIFIED | 获证0笔；真实账户流水UNKNOWN |
| NET_REVENUE_RECEIVED | 获证US$0；真实净到账UNKNOWN |

支付路线无可信账户证据且无主动真人兴趣，本轮未联系第八/第九家、未催七家或重发Wingsplain；没有新公开推广、泛Pinterest帖子或冷邮件。当前唯一认证后续动作是定位用户已看到的Payhip后台与工具控制页的差异，再回读支付设置；不重复提交同一登录错误。没有后台值守或自动跟进。


### V2续接 — 2026-10-16 23:47:27–23:48:01 Asia/Shanghai

用户授权“你帮我操作”后，续接原Firecrawl云会话实测：仍为Payhip登录页；邮箱字段已填写=false、密码字段已填写=false。没有可直接提交的现成登录输入，未点击空表单、重试登录、重建会话或取用其它位置的凭据。当前可控会话认证仍为HUMAN_REQUIRED；这不能否定用户在其它可见页面的登录确认。唯一必要人工动作是在该云端平台登录页填写自己的账号密码并完成正常认证，凭据不发聊天。其后再回读支付设置。未创建商品、结账或联盟链接，未出站、收付资金；九项验收及实际流水UNKNOWN的边界均不变。仅使用云端和已连接GitHub，未访问本地设备/文件。

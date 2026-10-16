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

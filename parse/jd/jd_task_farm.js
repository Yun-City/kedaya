const Template = require('../../template');
const got = require('got');
const api = got.extend({
    retry: { limit: 0 },
});
const moment = require('moment');
let xkProxy = null;
let xkProxyCount = 0;
require("global-agent/bootstrap");

class Main extends Template {
    constructor() {
        super()
        this.title = "京东东东农场"
        this.cron = "33 0,11,17,22 * * *"
        // this.thread = 2
        this.task = 'local'
        this.import = ['fs', 'jdAlgo']
        this.readme = `[jd_task_farm]
#signCard=1                   # 加签卡
#doubleCard=1             # 双倍水滴卡
#fastCard=1                   # 快速浇水卡
#beanCard=1                # 水滴换豆卡
stock=100                    # 保留水滴数
#tenWater=1                 # 只做10次浇水的任务,后续不浇水
cache=1                          # 缓存助力code
helpWaitting=1000     # 助力等待时间20s,默认6s
#helpRandom=1            # 随机助力
`
    }

    async prepare() {
        this.algo = new this.modules.jdAlgo({
            appId: "86ba5",
            type: 'app',
        })
        console.log("正在获取助力码")
        
        try {
            let txt = this.modules.fs.readFileSync(`${this.dirname}/invite/jd_task_farm.json`).toString()
            if (txt.includes("shareCode")) {
                this.code = this.loads(txt)
            }
        } catch (e) {
        }
        console.log(this.dumps(this.code))
    }

    async main(p) {
        let cookie = p.cookie;
        // let a = await this.algo.curl({
        //         'url': `https://api.m.jd.com/client.action`,
        //         'form': `functionId=collect_exchangeAward&body={"type":3}&appid=wh5&client=apple&clientVersion=10.2.4`,
        //         cookie
        //     }
        // )
        // console.log(a.result||a)
        // return
        
        if (!xkProxy || moment(xkProxy['expire_time']) < moment(new moment()).add(3, 'm')) {
                await getProxy();
            }
        
        if (xkProxy && moment(xkProxy['expire_time']) > moment()) {
        global.GLOBAL_AGENT.HTTPS_PROXY = `http://${xkProxy.ip}:${xkProxy.port}`;
        console.log(`代理成功：${xkProxy.ip}:${xkProxy.port}\n过期时间：${xkProxy['expire_time']}`);
    }    
        
        
        
        let init = await this.algo.curl({
                'url': 'https://api.m.jd.com/client.action?functionId=initForFarm',
                'form': `body={"version":16,"channel":3}&appid=wh5&client=apple&clientVersion=10.2.4`,
                cookie,
                algo: {
                    type: "app",
                    appId: "235ec",
                }
            }
        )
               
        if (init.code == '3') {
            console.log(`错误了哟 ${init.msg}`)
            this.notices('账号过期了', p.user)
            return
        }
        if (!init.farmUserPro) {
            console.log("正在播种")
            await this.algo.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=choiceGoodsForFarm&body={"imageUrl":"","nickName":"","shareCode":"","goodsType":"mihoutao22","type":"0","babelChannel":"121","version":16,"channel":1}&appid=wh5&client=apple&clientVersion=10.2.4`,
                    cookie
                }
            )
        }
        if (init.farmUserPro.treeState == 2) {
            console.log("可以兑换奖品了")
            this.notices('可以兑换奖品了', p.user)
        }
        else if (init.farmUserPro.treeState == 0) {
            console.log("正在播种")
            let exc = await this.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=getExchangeLevelList&body={"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                    cookie
                }
            )
            if (this.haskey(init, 'farmLevelWinGoods')) {
                let goods
                for (let i of Object.values(init.farmLevelWinGoods)) {
                    if (this.dumps(i) != "[]") {
                        goods = i[0]
                    }
                }
                if (goods) {
                    console.log(`正在种植:`, goods.name)
                    let choic = await this.algo.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=choiceGoodsForFarm&body={"goodsType":"${goods.type}","type":"0","babelChannel":"121","version":16,"channel":1}&appid=wh5&client=apple&clientVersion=10.2.4`,
                            // 'form':``,
                            cookie
                        }
                    )
                }
            }
        }
        let amount = this.haskey(init, 'farmUserPro.totalEnergy')
        let treeTotalEnergy = this.haskey(init, 'farmUserPro.treeTotalEnergy')
        let fi = await this.algo.curl({
                'url': `https://api.m.jd.com/client.action?functionId=friendListInitForFarm&body={"lastId":null,"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                // 'form':``,
                cookie
            }
        )
        if (!this.dumps(this.code).includes(init.farmUserPro.shareCode)) {
            this.code.push({
                shareCode: init.farmUserPro.shareCode, user: p.user
            })
        }
        this.dict[this.userPin(cookie)] = {shareCode: init.farmUserPro.shareCode, user: p.user}
        if (!fi.newFriendMsg) {
            let fcode = this.column([...this.code], 'shareCode')
            for (let i of this.random(fcode, 3)) {
                console.log("删除好友:", i)
                let sc = await this.algo.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=deleteFriendForFarm&body={"shareCode":"${i}","version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.4.2`,
                    // 'form':``,
                    cookie
                })
                await this.wait(2000)
                console.log("添加好友:", i)
                let tj = await this.algo.curl({
                        'url': `https://api.m.jd.com/client.action?functionId=initForFarm&body={"mpin":"","utm_campaign":"","utm_medium":"appshare","shareCode":"${i}-inviteFriend","utm_term":"Wxfriends","utm_source":"iosapp","imageUrl":"","nickName":"","version":16,"channel":2,"babelChannel":0}&appid=wh5&client=apple&clientVersion=10.2.4`,
                        // 'form':``,
                        cookie,
                        algo: {
                            type: "app",
                            appId: "235ec",
                        }
                    }
                )
                await this.wait(2000)
            }
            await this.algo.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=awardInviteFriendForFarm&body={}&appid=wh5&client=apple&clientVersion=10.2.4`,
                    // 'form':``,
                    cookie
                }
            )
        }
        let qdd = await this.algo.curl({
                'url': `https://api.m.jd.com/client.action?functionId=clockInForFarm&body={"type":1,"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                // 'form':``,
                cookie,
                algo: {
                    type: "app",
                    appId: "6cebf",
                }
            }
        )
        // let qdd = await this.algo.curl({
        //         'url': `https://api.m.jd.com/client.action?functionId=clockInInitForFarm&body={"timestamp":${this.timestamp},"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
        //         // 'form':``,
        //         cookie
        //     }
        // )
        if (qdd.amount) {
            console.log("签到获得水滴", qdd.amount)
        }
        else {
            console.log("已经签到过了")
        }
        // 7天奖励
        qdd = await this.algo.curl({
                'url': `https://api.m.jd.com/client.action?functionId=clockInInitForFarm&body={"timestamp":${this.timestamp},"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                // 'form':``,
                cookie,
                algo: {
                    type: "app",
                    appId: "1a13f",
                }
            }
        )
        for (let i of qdd.themes || []) {
            if (!i.hadGot) {
                let fo = await this.algo.curl({
                        'url': `https://api.m.jd.com/client.action?functionId=clockInFollowForFarm&body={"id":"${i.id}","type":"theme","step":1,"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                        // 'form':``,
                        cookie
                    }
                )
                await this.wait(5000)
                let foo = await this.algo.curl({
                        'url': `https://api.m.jd.com/client.action?functionId=clockInFollowForFarm&body={"id":"${i.id}","type":"theme","step":2,"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                        // 'form':``,
                        cookie
                    }
                )
                console.log("限时关注获得水滴:", foo.amount)
            }
        }
        // 领取弹窗水滴
        let tcs = await this.algo.curl({
                'url': `https://api.m.jd.com/client.action?functionId=gotWaterGoalTaskForFarm&body={"type":3,"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                // 'form':``,
                cookie
            }
        )
        if (tcs.amount) {
            console.log("弹窗获得水滴", qdd.amount)
        }
        // 东东乐园
        let ly = await this.algo.curl({
                'url': `https://api.m.jd.com/client.action`,
                'form': `functionId=ddnc_farmpark_Init&body={"version":16,"channel":1}&appid=wh5&client=apple&clientVersion=10.2.4`,
                cookie
            }
        )
        for (let i of ly.buildings || []) {
            if (i.name.includes('泡泡龙') || i.name.includes("天天红包")) {
                if (this.haskey(i, 'topResource.task.status', 1)) {
                    console.log(`正在浏览:${i.name}`)
                    let pp = await this.algo.curl({
                            'url': `https://api.m.jd.com/client.action`,
                            'form': `functionId=ddnc_farmpark_markBrowser&body={"version":16,"channel":1,"advertId":"${i.topResource.task.advertId}"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                            cookie
                        }
                    )
                    await this.wait(i.topResource.task.browseSeconds * 1000)
                    let ppp = await this.algo.curl({
                            'url': `https://api.m.jd.com/client.action`,
                            'form': `functionId=ddnc_farmpark_browseAward&body={"version":16,"channel":1,"advertId":"${i.topResource.task.advertId}","index":8,"type":1}&appid=wh5&client=apple&clientVersion=10.2.4`,
                            cookie
                        }
                    )
                }
            }
        }
        for (let n = 1; n<=2; n++) {
            let taskList = await this.algo.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=taskInitForFarm&body={"version":16,"channel":${n},"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                    // 'form':``,
                    cookie,
                    algo: {
                        type: "app",
                        appId: "6ceb9",
                    }
                }
            )
            for (let i in taskList) {
                if (typeof (taskList[i]) == 'object') {
                    let dotask = taskList[i]
                    switch (i) {
                        case 'signInit':
                            if (dotask.todaySigned) {
                                console.log(`今天已签到,已经连续签到${dotask.totalSigned}天,下次签到可得${dotask.signEnergyEachAmount}g`);
                            }
                            else {
                                let qd = await this.algo.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=signForFarm&body={"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                        cookie
                                    }
                                )
                                if (qd.code === "0") {
                                    console.log(`签到成功获得${qd.amount}g💧`)
                                }
                                else {
                                    console.log(`签到结果:  ${JSON.stringify(qd)}`);
                                }
                            }
                            break
                        case 'gotBrowseTaskAdInit':
                            if (!dotask.f) {
                                for (let j of dotask.userBrowseTaskAds) {
                                    console.log("正在浏览任务")
                                    let s = await this.algo.curl({
                                            'url': `https://api.m.jd.com/client.action?functionId=browseAdTaskForFarm&body={"advertId":"${j.advertId}","type":0,"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                            cookie
                                        }
                                    )
                                    await this.wait(j.time * 1000)
                                    await this.algo.curl({
                                            'url': `https://api.m.jd.com/client.action?functionId=browseAdTaskForFarm&body={"advertId":"${j.advertId}","type":1,"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                            cookie
                                        }
                                    )
                                }
                            }
                            else {
                                console.log("浏览任务已完成")
                            }
                            break
                        case'waterRainInit':
                            if (!dotask.f) {
                                if (dotask.lastTime + 3 * 60 * 60 * 1000<this.timestamp) {
                                    let s = await this.algo.curl({
                                            'url': `https://api.m.jd.com/client.action`,
                                            'form': `functionId=waterRainForFarm&body={"type":1,"hongBaoTimes":100,"version":16}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                            cookie
                                        }
                                    )
                                    if (s.code === '0') {
                                        console.log('水滴雨任务执行成功，获得水滴：' + s.addEnergy + 'g');
                                        console.log(`第${dotask.winTimes + 1}次水滴雨获得${s.addEnergy}g水滴`);
                                    }
                                }
                                else {
                                    console.log("还未到时间可收取水滴雨")
                                }
                            }
                            else {
                                console.log("水滴雨已经完成")
                            }
                            break
                        case 'firstWaterInit':
                            if (!dotask.f) {
                                let js = await this.algo.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=waterGoodForFarm&body={"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                        // 'form':``,
                                        cookie
                                    }
                                )
                                let s = await this.algo.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=firstWaterTaskForFarm&body={"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                        // 'form':``,
                                        cookie
                                    }
                                )
                                if (s.code === '0') {
                                    console.log(`首次浇水奖励获得${s.amount}g💧`);
                                }
                                else {
                                    console.log(`领取首次浇水奖励结果:  ${JSON.stringify(s)}`);
                                }
                            }
                            else {
                                console.log("首次浇水任务已完成")
                            }
                            break
                        case 'waterFriendTaskInit':
                            if (!dotask.f) {
                                if (dotask.waterFriendCountKey<dotask.waterFriendMax) {
                                    let f = await this.algo.curl({
                                            'url': `https://api.m.jd.com/client.action?functionId=friendListInitForFarm&body={"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                            // 'form':``,
                                            cookie
                                        }
                                    )
                                    let nnn = 0
                                    if (f.friends.length) {
                                        for (let ff of f.friends) {
                                            if (ff.friendState) {
                                                console.log(`正在给: ${ff.shareCode} 浇水`)
                                                let s = await this.algo.curl({
                                                        'url': `https://api.m.jd.com/client.action?functionId=waterFriendForFarm&body={"shareCode":"${ff.shareCode}","version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                                        // 'form':``,
                                                        cookie
                                                    }
                                                )
                                                nnn++
                                                await this.wait(3000)
                                            }
                                            if (nnn == 2) {
                                                break
                                            }
                                        }
                                    }
                                    else {
                                        console.log("请添加好友再来吧")
                                    }
                                }
                                let ss = await this.algo.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=waterFriendGotAwardForFarm&body={"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                        // 'form':``,
                                        cookie
                                    }
                                )
                            }
                            else {
                                console.log(`给${dotask.waterFriendMax}个好友浇水任务已完成`)
                            }
                            break
                        case 'gotThreeMealInit':
                            if (!dotask.f) {
                                let s = await this.algo.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=gotThreeMealForFarm&body={"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                        // 'form':``,
                                        cookie
                                    }
                                )
                                if (s.code === "0") {
                                    console.log(`定时领水获得${s.amount}g💧`);
                                }
                                else {
                                    console.log(`定时领水成功结果:  ${JSON.stringify(s)}`);
                                }
                            }
                            else {
                                console.log('当前不在定时领水时间或者已经领过')
                            }
                            break
                        case 'treasureBoxInit':
                            if (!dotask.f) {
                                let s = await this.algo.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=ddnc_getTreasureBoxAward&body={"babelChannel":"121","line":"","channel":3,"type":1,"version":16}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                        cookie
                                    }
                                )
                                await this.algo.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=ddnc_getTreasureBoxAward&body={"babelChannel":"121","line":"","channel":3,"type":2,"version":16}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                        cookie
                                    }
                                )
                            }
                            break
                        case 'totalWaterTaskInit':
                            if (!dotask.f) {
                                if (dotask.totalWaterTaskTimes<dotask.totalWaterTaskLimit) {
                                    for (let kk = 0; kk<dotask.totalWaterTaskLimit - dotask.totalWaterTaskTimes + 6; kk++) {
                                        await this.algo.curl({
                                                'url': `https://api.m.jd.com/client.action?functionId=waterGoodForFarm&body={"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                                // 'form':``,
                                                cookie
                                            }
                                        )
                                    }
                                }
                                let s = await this.algo.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=totalWaterTaskForFarm&body={"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                        // 'form':``,
                                        cookie
                                    }
                                )
                                if (s.code === '0') {
                                    console.log(`十次浇水奖励获得${s.totalWaterTaskEnergy}g💧`);
                                }
                                else {
                                    console.log(`领取10次浇水奖励结果:  ${JSON.stringify(s)}`);
                                }
                            }
                            else {
                                console.log("累计浇水已经完成")
                            }
                            break
                        case 'treasureBoxInit-getBean':
                            if (!dotask.f) {
                                await this.algo.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=ddnc_getTreasureBoxAward&body={"babelChannel":"121","line":"getBean","channel":3,"type":1,"version":16}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                        // 'form':``,
                                        cookie
                                    }
                                )
                                // await this.algo.curl({
                                //         'url': `https://api.m.jd.com/client.action?functionId=findBeanScene`,
                                //         'form': 'functionId=findBeanScene&body=%7B%22rnClient%22%3A%222%22%2C%22viewChannel%22%3A%22AppHome%22%2C%22source%22%3A%22AppHome%22%2C%22rnVersion%22%3A%224.7%22%7D&uuid=b39756aeea55b9cebae9f&client=apple&clientVersion=10.0.10&st=1638541231790&sv=100&sign=f7c5657c19354b17600ed5d59a6c0047',
                                //         cookie
                                //     }
                                // )
                                // await this.algo.curl({
                                //         'url': `https://api.m.jd.com/client.action?functionId=beanTaskList`,
                                //         'form': 'functionId=beanTaskList&body=%7B%22viewChannel%22%3A%22AppHome%22%7D&uuid=a2874756f39b780840&client=apple&clientVersion=10.0.10&st=1638541338389&sv=100&sign=f1aff99ef35e77739fef2967328475d1',
                                //         cookie
                                //     }
                                // )
                                // await this.algo.curl({
                                //         'url': `https://api.m.jd.com/client.action?functionId=farmMarkStatus&body={"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                //         // 'form':``,
                                //         cookie
                                //     }
                                // )
                                await this.algo.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=ddnc_getTreasureBoxAward&body={"babelChannel":"121","line":"getBean","channel":3,"type":2,"version":16}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                        // 'form':``,
                                        cookie
                                    }
                                )
                            }
                            break
                        default:
                            // console.log(i)
                            // console.log(dotask)
                            break
                    }
                }
            }
        }
        for (let i = 0; i<10; i++) {
            let s = await this.algo.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=getFullCollectionReward&body={"type":2,"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                    // 'form':``,
                    cookie
                }
            )
            if (s.code === '0') {
                if (!s.hasLimit) {
                    console.log(`小鸭子游戏:${s.title}`);
                }
                else {
                    console.log(`${s.title}`)
                    break;
                }
            }
            else if (s.code === '10') {
                console.log(`小鸭子游戏达到上限`)
                break;
            }
        }
        let salveHelpAddWater = 0;
        let remainTimes = 3;//今日剩余助力次数,默认3次（京东农场每人每天3次助力机会）。
        let helpSuccessPeoples = '';//成功助力好友
        let helpCode = this.profile.helpRandom ? this.random(this.code, this.code.length) : this.code
        for (let code of helpCode) {
            if (code.finish) {
                continue
            }
            let s = await this.algo.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=initForFarm&body={"mpin":"","utm_campaign":"t_335139774","utm_medium":"appshare","shareCode":"${code.shareCode}","utm_term":"Wxfriends","utm_source":"iosapp","imageUrl":"","nickName":"${p.user}","version":16,"channel":3,"babelChannel":0}&appid=wh5&osVersion=iOS%2013.7&screen=375*667&networkType=true&timestamp=1662220836165&d_brand=iPhone&d_model=iPhone%206s%3CiPhone8%2C1%3E&wqDefault=true&client=ios&clientVersion=8.0.27`,
                    'cookie': p.cookie,
                    algo: {
                        type: "app",
                        appId: "235ec",
                    }
                }
            )
            if (s.code === '0') {
                if (s.helpResult.code === '0') {
                    //助力成功
                    salveHelpAddWater += s.helpResult.salveHelpAddWater;
                    console.log(`助力好友结果: 已成功给${s.helpResult.masterUserInfo.nickName}助力`);
                    console.log(`给好友${s.helpResult.masterUserInfo.nickName}助力获得${s.helpResult.salveHelpAddWater}g水滴`)
                    helpSuccessPeoples += (s.helpResult.masterUserInfo.nickName || '匿名用户') + ',';
                }
                else if (s.helpResult.code === '8') {
                    console.log(`助力好友结果: 助力${s.helpResult.masterUserInfo.nickName}失败，您今天助力次数已耗尽`);
                }
                else if (s.helpResult.code === '9') {
                    console.log(`助力好友结果: 之前给${s.helpResult.masterUserInfo.nickName}助力过了`);
                }
                else if (s.helpResult.code === '10') {
                    code.finish = 1
                    console.log(`助力好友结果: 好友${s.helpResult.masterUserInfo.nickName}已满五人助力`);
                }
                console.log(`今日助力次数还剩: ${s.helpResult.remainTimes}次`);
                let remainTimes = s.helpResult.remainTimes;
                if (s.helpResult.remainTimes === 0) {
                    console.log(`您当前助力次数已耗尽，跳出助力`);
                    break
                }
                let helpWaitting = parseInt(this.profile.helpWaitting || 1000)
                await this.wait(helpWaitting)
            }
            else if (s.code == "403") {
                console.log("运行环境异常，请您从正规渠道参与活动，稍后再试~")
                break
            }
            else {
                console.log(`助力失败: ${JSON.stringify(s)}`);
            }
        }
        // 天天红包
        let red = await this.algo.curl({
                'url': `https://api.m.jd.com/client.action?functionId=initForTurntableFarm&body={"version":16,"channel":1}&appid=wh5&client=apple&clientVersion=10.2.4`,
                // 'form':``,
                cookie
            }
        )
        for (let i of red.turntableBrowserAds) {
            if (!i.status) {
                console.log(`正在浏览:${i.main}`)
                let bt = await this.algo.curl({
                        'url': `https://api.m.jd.com/client.action?functionId=browserForTurntableFarm&body={"type":1,"adId":"${i.adId}","version":16,"channel":1}&appid=wh5&client=apple&clientVersion=10.2.4`,
                        // 'form':``,
                        cookie
                    }
                )
                await this.wait(i.browserTimes * 1000)
                let btt = await this.algo.curl({
                        'url': `https://api.m.jd.com/client.action?functionId=browserForTurntableFarm&body={"type":2,"adId":"${i.adId}","version":16,"channel":1}&appid=wh5&client=apple&clientVersion=10.2.4`,
                        // 'form':``,
                        cookie
                    }
                )
            }
        }
        let codess = [...this.code, ...this.code]
        for (let i = 0; i<5; i++) {
            let codd = (codess[i + p.index + 3] || codess[i] || codess[0]).shareCode
            if (i>3) {
                // 把一些错误剩余没有助力到的给主号
                codd = codess[this.rand(0, 3)].shareCode
            }
            let he = await this.algo.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=initForFarm&body={"shareCode":"${codd}-3","lng":"0.000000","lat":"0.000000","version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                    'cookie': p.cookie
                }
            )
            if (!this.haskey(he, 'canHongbaoContineUse')) {
                break
            }
            await this.wait(3000)
        }
        // 天天红包定时奖励
        await this.algo.curl({
                'url': `https://api.m.jd.com/client.action?functionId=timingAwardForTurntableFarm&body={"version":16,"channel":1}&appid=wh5&client=apple&clientVersion=10.2.4`,
                // 'form':``,
                cookie
            }
        )
        let cj = await this.algo.curl({
                'url': `https://api.m.jd.com/client.action?functionId=initForTurntableFarm&body={"version":16,"channel":1}&appid=wh5&client=apple&clientVersion=10.2.4`,
                // 'form':``,
                cookie
            }
        )
        for (let i = 0; i<cj.remainLotteryTimes; i++) {
            let s = await this.algo.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=lotteryForTurntableFarm&body={"type":1,"version":16,"channel":1}&appid=wh5&client=apple&clientVersion=10.2.4`,
                    // 'form':``,
                    cookie
                }
            )
            await this.wait(1000)
            console.log("抽奖:", this.dumps(s))
        }
        for (let i of Array(4)) {
            let exc = await this.algo.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=farmAssistInit&body={"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                    cookie
                }
            )
            if (!exc.f) {
                for (let i of exc.assistStageList || []) {
                    if (i.percentage == '100%') {
                        let excc = await this.algo.curl({
                                'url': `https://api.m.jd.com/client.action?functionId=receiveStageEnergy&body={"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                                cookie
                            }
                        )
                        if (excc.amount) {
                            console.log("助力有奖获得水滴:", excc.amount)
                        }
                        this.wait(1000)
                    }
                }
            }
        }
        init = await this.algo.curl({
                'url': 'https://api.m.jd.com/client.action?functionId=initForFarm',
                'form': `body={"version":16,"channel":3}&appid=wh5&client=apple&clientVersion=10.2.4`,
                cookie
            }
        )
        amount = this.haskey(init, 'farmUserPro.totalEnergy') || amount
        // let treeTotalEnergy = this.haskey(init, 'farmUserPro.treeTotalEnergy')
        let custom = this.getValue('custom')
        let myCard = await this.algo.curl({
                'url': `https://api.m.jd.com/client.action?functionId=myCardInfoForFarm&body={"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                // 'form':``,
                cookie
            }
        )
        if (this.haskey(myCard, 'cardInfos')) {
            let cardInfos = this.column(myCard.cardInfos, 'useTimesInDay', 'type')
            if (this.profile.doubleCard && amount>99 && myCard.doubleCard) {
                for (let i of Array(3)) {
                    let doubleCard = await this.algo.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=userMyCardForFarm&body={"cardType":"doubleCard","type":"","version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                            cookie
                        }
                    )
                    if (this.haskey(doubleCard, 'addWater')) {
                        console.log("双倍水滴:", doubleCard.addWater)
                        amount += doubleCard.addWater
                        await this.wait(1000)
                    }
                    else {
                        console.log("加倍失败")
                        break
                    }
                }
            }
            if (this.profile.beanCard && myCard.beanCard) {
                for (let i = 0; i<Math.min(Math.floor(amount / 110), 1); i++) {
                    let d = await this.algo.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=userMyCardForFarm&body={"cardType":"beanCard","type":"","version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.4.0`,
                            cookie
                        }
                    )
                    if (d.beanCount) {
                        amount = amount - d.useWater
                        console.log(p.user, `水滴换豆: ${d.beanCount}`)
                        await this.wait(1000)
                    }
                    else {
                        break
                    }
                }
            }
            if (this.profile.signCard && myCard.signCard) {
                for (let i of Array(3)) {
                    let signCard = await this.algo.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=userMyCardForFarm&body={"cardType":"signCard","type":"","version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                            // 'form':``,
                            cookie
                        }
                    )
                    if (this.haskey(signCard, 'signDay')) {
                        console.log("正在加签:", signCard.signDay)
                        await this.wait(1000)
                    }
                    else {
                        console.log("加签失败")
                        break
                    }
                }
            }
        }
        let jl = await this.algo.curl({
                'url': `https://api.m.jd.com/client.action?functionId=clockInForFarm&body={"type":2,"version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                // 'form':``,
                cookie
            }
        )
        if (jl.amount) {
            console.log("连续签到获得水滴:", jl.amount)
            amount += jl.amountamount
        }
        let stock = parseInt(this.profile.stock || 110)
        if (!this.profile.tenWater) {
            if (myCard.fastCard && amount - 100>stock) {
                await this.wait(1000)
                for (let i = 0; i<(amount / 100); i++) {
                    if (amount - 100<stock) {
                        break
                    }
                    let fastCard = await this.algo.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=userMyCardForFarm&body={"cardType":"fastCard","type":"","version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                            cookie
                        }
                    )
                    if (this.haskey(fastCard, 'waterEnergy')) {
                        console.log("快速浇水:", fastCard.waterEnergy)
                        amount = amount - fastCard.waterEnergy
                        await this.wait(1000)
                    }
                    else {
                        console.log("快速浇水失败")
                        break
                    }
                }
            }
            await this.wait(1000)
            for (let i = 0; i<(amount - stock) / 10; i++) {
                for (let j = 0; j<3; j++) {
                    var js = await this.algo.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=waterGoodForFarm&body={"type":"","version":16,"channel":1,"babelChannel":"121"}&appid=wh5&client=apple&clientVersion=10.2.4`,
                            // 'form':``,
                            cookie
                        }
                    )
                    if (js.totalEnergy) {
                        break
                    }
                    else {
                        await this.wait(2000)
                    }
                }
                if (!js.totalEnergy) {
                    break
                }
                if (js.treeEnergy == treeTotalEnergy) {
                    this.notices("可以兑换奖品了", p.user)
                }
                console.log("正在浇水,剩余水滴:", js.totalEnergy, '总共浇水:', js.treeEnergy, '需要水滴', treeTotalEnergy)
            }
        }
    }

    async extra() {
        console.log(`此次运行助力码:`)
        console.log(this.dumps(Object.values(this.dict)))
        let custom = this.getValue('custom')
        if (this.profile.cache) {
            console.log("已经设置缓存:/invite/jd_task_farm.json,跳过写入")
        }
        else {
            console.log("农场有检测,号多容易黑ip,建议缓存JSON文件")
            let json = []
            for (let cookie of this.cookies.all) {
                let pin = this.userPin(cookie)
                if (this.dict[pin]) {
                    json.push(this.dict[pin])
                }
            }
            if (json.length) {
                await this.modules.fs.writeFile(`${this.dirname}/invite/jd_task_farm.json`, this.dumps(json), (error) => {
                    if (error) return console.log("写入化失败" + error.message);
                    console.log("东东农场ShareCode写入成功");
                })
            }
        }
    }
}

async function getProxy() {
    if (xkProxyCount > 10) {
        console.log("获取代理次数超过10次,停止获取。");
        return;
    }
    xkProxyCount++;
    console.log("开始获取代理");
    var result = null;
    try {
        var options = {
            'method': 'get',
            'url': 'http://zltiqu.pyhttp.taolop.com/getip?count=1&neek=54564&type=2&yys=0&port=1&sb=&mr=2&sep=0&ts=1&ys=1&cs=1&time=4',
            'headers': {
                'Content-Type': 'application/json'
            }
        };
        var response = await api(options);
        console.log("获取代理IP结果：" + response.body);
        result = JSON.parse(response.body);
    } catch (e) {
        console.log("代理获取异常，尝试重新获取。");
        await $.wait(2 * 1000);
        await getProxy();
    }
    if (result && result.code == "0" && result.data) {
        xkProxy = result.data[0];
    } else if (result.code == "111") {
        console.log(result.msg)
        await $.wait(2 * 1000);
        await getProxy();
    }
}

module.exports = Main;

// Concept diagrams shown under the explanation in lessons and practice (never in mock exams,
// which stay text-only like the real exam). About 30 diagrams cover the main topics; each
// question gets the first one whose rule matches its text and right answer, and the box
// that matches the right answer is highlighted.
//
// A diagram is drawn on a 320-wide canvas: groups (dashed or solid containers), nodes
// (boxes with an optional icon and a colour category) and edges (arrows between nodes, or
// free lines). Labels are either one string or [English, Thai].
(() => {
  const W = 320;
  // node: [id, x, y, w, h, label, category, icon, highlightRegex]
  const N = (id, x, y, w, h, t, c = 'plain', i = '', m = null) => ({ id, x, y, w, h, t, c, i, m });
  // group: [x, y, w, h, label, style, highlightRegex]
  const G = (x, y, w, h, t, s = 'dash', m = null) => ({ x, y, w, h, t, s, m });
  // edge between nodes: [from, to, label, options]  options: { dash, both, none }
  const E = (a, b, t = '', o = {}) => ({ a, b, t, o });

  const D = {
    global: { h: 150, cap: ['A Region has several isolated Availability Zones (each one or more data centers). Edge locations sit close to users for caching.', 'Region หนึ่งมีหลาย Availability Zone ที่แยกกัน (แต่ละ AZ มีดาต้าเซ็นเตอร์หนึ่งแห่งขึ้นไป) ส่วน edge location อยู่ใกล้ผู้ใช้เพื่อแคชคอนเทนต์'],
      groups: [G(6, 8, 230, 134, ['AWS Region', 'AWS Region'], 'solid', /\bregion\b/i), G(14, 28, 68, 104, 'AZ a', 'dash', /availability zone|\bAZ\b/i), G(88, 28, 68, 104, 'AZ b', 'dash', /availability zone|\bAZ\b/i), G(162, 28, 68, 104, 'AZ c', 'dash', /availability zone|\bAZ\b/i)],
      nodes: [N('d1', 20, 62, 56, 40, ['Data\ncenters', 'ดาต้า\nเซ็นเตอร์'], 'compute', 'server'), N('d2', 94, 62, 56, 40, ['Data\ncenters', 'ดาต้า\nเซ็นเตอร์'], 'compute', 'server'), N('d3', 168, 62, 56, 40, ['Data\ncenters', 'ดาต้า\nเซ็นเตอร์'], 'compute', 'server'),
        N('e1', 246, 22, 68, 40, 'Edge\nlocation', 'net', 'globe', /edge location|cloudfront|local zone|outposts/i), N('e2', 246, 90, 68, 40, 'Edge\nlocation', 'net', 'globe', /edge location|cloudfront/i)],
      edges: [] },

    shared: { h: 150, cap: ['You secure what you put in the cloud; AWS secures the cloud itself. Managed services move more of the work to AWS.', 'คุณดูแลความปลอดภัยของสิ่งที่นำขึ้นคลาวด์ ส่วน AWS ดูแลตัวคลาวด์ บริการแบบ managed ย้ายงานไปให้ AWS มากขึ้น'],
      groups: [G(6, 6, 308, 64, ['Customer: security IN the cloud', 'ลูกค้า: ความปลอดภัยในคลาวด์'], 'solid', /customer/i), G(6, 80, 308, 64, ['AWS: security OF the cloud', 'AWS: ความปลอดภัยของคลาวด์'], 'solid', /^(the )?aws$/i)],
      nodes: [N('c1', 14, 28, 68, 34, ['Data &\nencryption', 'ข้อมูล &\nการเข้ารหัส'], 'sec', '', /data|encrypt/i), N('c2', 88, 28, 68, 34, ['IAM users\n& access', 'IAM และ\nสิทธิ์'], 'sec', '', /\biam\b|access|permission/i),
        N('c3', 162, 28, 68, 34, ['Guest OS\npatching', 'แพตช์ OS\nบน EC2'], 'sec', '', /patch|guest|operating system/i), N('c4', 236, 28, 70, 34, ['Security\ngroups', 'Security\ngroups'], 'sec', '', /security group|firewall/i),
        N('a1', 14, 102, 68, 34, ['Physical\ndata centers', 'ศูนย์ข้อมูล\nทางกายภาพ'], 'plain', '', /physical|data cent|facilit/i), N('a2', 88, 102, 68, 34, ['Hardware', 'ฮาร์ดแวร์'], 'plain', '', /hardware/i),
        N('a3', 162, 102, 68, 34, ['Global\nnetwork', 'เครือข่าย\nทั่วโลก'], 'plain', '', /network infra/i), N('a4', 236, 102, 70, 34, ['Hypervisor', 'Hypervisor'], 'plain', '', /hypervisor|virtuali/i)],
      edges: [] },

    vpc: { h: 178, cap: ['Instances in a private subnet reach the internet through a NAT gateway in a public subnet. Nothing on the internet can connect in.', 'instance ใน subnet ส่วนตัวออกอินเทอร์เน็ตผ่าน NAT gateway ใน subnet สาธารณะ และจากอินเทอร์เน็ตเชื่อมต่อเข้ามาไม่ได้'],
      groups: [G(6, 40, 308, 132, 'VPC', 'solid', /^(amazon )?vpc$/i), G(14, 86, 144, 78, ['Public subnet', 'Subnet สาธารณะ'], 'dash', /public subnet/i), G(164, 86, 142, 78, ['Private subnet', 'Subnet ส่วนตัว'], 'dash', /private subnet/i)],
      nodes: [N('inet', 116, 4, 88, 26, ['Internet', 'อินเทอร์เน็ต'], 'user', 'globe'), N('igw', 108, 50, 104, 26, 'Internet gateway', 'net', '', /internet gateway|egress-only/i),
        N('nat', 26, 114, 100, 36, 'NAT gateway', 'net', '', /\bnat\b/i), N('ec2', 190, 114, 106, 36, ['EC2\n(no public IP)', 'EC2\n(ไม่มี IP สาธารณะ)'], 'compute', 'server')],
      edges: [E('ec2', 'nat', ['outbound', 'ขาออก']), E('nat', 'igw'), E('igw', 'inet', '', { both: true })] },

    sgnacl: { h: 150, cap: ['Security groups remember connections, so replies are allowed automatically. Network ACLs don’t: return traffic needs its own rule.', 'Security group จำการเชื่อมต่อ จึงอนุญาตการตอบกลับให้อัตโนมัติ ส่วน network ACL ไม่จำ ทราฟฟิกขากลับต้องมีกฎของตัวเอง'],
      groups: [G(6, 6, 308, 138, 'Subnet', 'solid')],
      nodes: [N('nacl', 14, 26, 292, 32, ['Network ACL · stateless · allow + deny · whole subnet', 'Network ACL · stateless · allow + deny · ทั้ง subnet'], 'sec', 'shield', /network acl|\bnacl/i),
        N('sg', 22, 74, 136, 58, ['Security group\nstateful · allow only\nper instance', 'Security group\nstateful · allow อย่างเดียว\nต่อ instance'], 'sec', 'shield', /security group/i),
        N('ec2', 196, 86, 100, 36, ['EC2 instance', 'EC2 instance'], 'compute', 'server')],
      edges: [E('sg', 'ec2', ['protects', 'ป้องกัน'], { dash: true })] },

    endpoint: { h: 124, cap: ['A VPC endpoint keeps traffic to AWS services on the AWS network: no NAT gateway or internet gateway needed.', 'VPC endpoint ทำให้ทราฟฟิกไปยังบริการ AWS อยู่ในเครือข่าย AWS ไม่ต้องใช้ NAT gateway หรือ internet gateway'],
      groups: [G(6, 6, 206, 112, 'VPC', 'solid'), G(14, 26, 190, 84, ['Private subnet', 'Subnet ส่วนตัว'])],
      nodes: [N('ec2', 24, 52, 70, 36, 'EC2', 'compute', 'server'), N('gwe', 112, 46, 84, 48, ['VPC endpoint\n(gateway or\ninterface)', 'VPC endpoint\n(gateway หรือ\ninterface)'], 'net', '', /endpoint|privatelink/i),
        N('s3', 232, 16, 82, 34, 'Amazon S3', 'storage', 'inbox'), N('ddb', 232, 74, 82, 34, 'DynamoDB', 'db', 'database')],
      edges: [E('ec2', 'gwe'), E('gwe', 's3'), E('gwe', 'ddb')] },

    hybrid: { h: 150, cap: ['Direct Connect is a dedicated private line: steady speed, not encrypted by default. A Site-to-Site VPN is encrypted and runs over the internet.', 'Direct Connect เป็นสายส่วนตัวเฉพาะ ความเร็วสม่ำเสมอ ไม่เข้ารหัสโดยค่าเริ่มต้น ส่วน Site-to-Site VPN เข้ารหัสและวิ่งผ่านอินเทอร์เน็ต'],
      groups: [],
      nodes: [N('onp', 6, 55, 82, 40, ['On-premises\ndata center', 'ดาต้าเซ็นเตอร์\nในองค์กร'], 'user', 'server'), N('vpc', 234, 55, 80, 40, ['AWS VPC', 'AWS VPC'], 'net', 'cloud'),
        N('dx', 116, 6, 90, 36, 'Direct Connect', 'net', '', /direct connect/i), N('vpn', 116, 108, 90, 36, 'Site-to-Site VPN', 'sec', 'lock', /\bvpn\b/i)],
      edges: [E('onp', 'dx', ['private line', 'สายส่วนตัว'], { at: [56, 44] }), E('dx', 'vpc'), E('onp', 'vpn', ['internet', 'อินเทอร์เน็ต'], { at: [56, 112] }), E('vpn', 'vpc', ['encrypted', 'เข้ารหัส'], { at: [266, 112] })] },

    tgw: { h: 136, cap: ['One hub connects many VPCs and on-premises networks. VPC peering links exactly two VPCs and doesn’t pass traffic on.', 'ศูนย์กลางเดียวเชื่อมหลาย VPC และเครือข่ายในองค์กร ส่วน VPC peering เชื่อมได้แค่สอง VPC และไม่ส่งต่อทราฟฟิก'],
      groups: [],
      nodes: [N('tgw', 114, 48, 92, 40, 'Transit Gateway', 'net', '', /transit gateway/i), N('v1', 6, 8, 84, 30, 'VPC A', 'net', 'cloud'), N('v2', 6, 98, 84, 30, 'VPC B', 'net', 'cloud'),
        N('v3', 230, 8, 84, 30, 'VPC C', 'net', 'cloud'), N('v4', 230, 98, 84, 30, ['On-premises', 'ในองค์กร'], 'user', 'server')],
      edges: [E('v1', 'tgw', '', { both: true }), E('v2', 'tgw', '', { both: true }), E('v3', 'tgw', '', { both: true }), E('v4', 'tgw', '', { both: true })] },

    cdn: { h: 112, cap: ['Users get cached copies from a nearby edge location. CloudFront only goes back to the origin when it doesn’t have the file yet.', 'ผู้ใช้ได้สำเนาที่แคชไว้จาก edge location ใกล้ๆ CloudFront จะไปขอจาก origin เฉพาะเมื่อยังไม่มีไฟล์นั้น'],
      groups: [],
      nodes: [N('u', 6, 44, 64, 34, ['Users\nworldwide', 'ผู้ใช้\nทั่วโลก'], 'user', 'user'), N('cf', 106, 36, 104, 50, ['CloudFront\nedge location\n(cache)', 'CloudFront\nedge location\n(แคช)'], 'net', 'globe', /cloudfront|edge|cach/i),
        N('o', 244, 40, 70, 42, ['Origin\nS3 or ALB', 'Origin\nS3 หรือ ALB'], 'storage', 'inbox', /origin|^(amazon )?s3\b/i)],
      edges: [E('u', 'cf', ['nearby', 'ใกล้'], { at: [88, 30] }), E('cf', 'o', ['on a miss', 'เมื่อไม่มีในแคช'], { at: [232, 30] })] },

    route53: { h: 134, cap: ['Route 53 answers DNS questions using a routing policy: failover, latency, weighted, geolocation and more, with health checks.', 'Route 53 ตอบ DNS ตาม routing policy เช่น failover, latency, weighted, geolocation โดยใช้ health check ร่วมด้วย'],
      groups: [],
      nodes: [N('u', 6, 48, 60, 36, ['Users', 'ผู้ใช้'], 'user', 'user'), N('r53', 90, 44, 96, 44, ['Route 53\nrouting policy', 'Route 53\nrouting policy'], 'net', 'globe', /route 53|routing|dns/i),
        N('p', 218, 8, 96, 42, ['Region 1\nhealthy ✓', 'Region 1\nปกติ ✓'], 'compute', 'server', /primary|latency/i), N('s', 218, 84, 96, 42, ['Region 2\nbackup', 'Region 2\nสำรอง'], 'compute', 'server', /secondary|failover/i)],
      edges: [E('u', 'r53'), E('r53', 'p', ['health check', 'health check'], { at: [150, 34] }), E('r53', 's', '', { dash: true })] },

    haweb: { h: 160, cap: ['The load balancer only sends traffic to healthy instances. If an AZ fails, Auto Scaling launches replacements in the other AZ.', 'Load balancer ส่งทราฟฟิกไปเฉพาะ instance ที่ปกติ ถ้า AZ หนึ่งล่ม Auto Scaling จะสร้าง instance ใหม่ในอีก AZ'],
      groups: [G(6, 82, 308, 72, 'Auto Scaling group', 'solid', /auto scaling/i), G(14, 100, 142, 48, 'AZ a'), G(164, 100, 142, 48, 'AZ b')],
      nodes: [N('u', 116, 2, 88, 26, ['Users', 'ผู้ใช้'], 'user', 'user'), N('lb', 104, 40, 112, 30, ['Load balancer', 'Load balancer'], 'net', 'activity', /load balanc|\balb\b|\bnlb\b|\belb\b|health check/i),
        N('e1', 30, 118, 52, 24, 'EC2', 'compute'), N('e2', 92, 118, 52, 24, 'EC2', 'compute'), N('e3', 180, 118, 52, 24, 'EC2', 'compute'), N('e4', 242, 118, 52, 24, 'EC2', 'compute')],
      edges: [E('u', 'lb'), E('lb', 'e1'), E('lb', 'e2'), E('lb', 'e3'), E('lb', 'e4')] },

    rds: { h: 134, cap: ['Multi-AZ = automatic failover, for availability. Read replicas = extra read capacity, and can sit in another Region.', 'Multi-AZ = สลับไปตัวสำรองอัตโนมัติ เพื่อความพร้อมใช้งาน ส่วน read replica = เพิ่มความสามารถในการอ่าน และอยู่อีก Region ได้'],
      groups: [G(6, 6, 150, 122, 'AZ a'), G(164, 6, 150, 122, 'AZ b')],
      nodes: [N('pri', 18, 28, 126, 40, ['Primary DB\nreads + writes', 'DB หลัก\nอ่าน + เขียน'], 'db', 'database', /primary/i),
        N('stb', 176, 28, 126, 40, ['Standby (Multi-AZ)\nno reads', 'Standby (Multi-AZ)\nไม่รับการอ่าน'], 'db', 'database', /multi-az|standby|failover/i),
        N('rr', 176, 80, 126, 40, ['Read replica\nreads only', 'Read replica\nอ่านอย่างเดียว'], 'db', 'database', /read replica|aurora replica/i)],
      edges: [E('pri', 'stb', ['sync', 'sync']), E('pri', 'rr', ['async', 'async'], { dash: true })] },

    cache: { h: 112, cap: ['Repeated reads are served from memory in microseconds, so the database does far less work.', 'การอ่านซ้ำๆ ได้จากหน่วยความจำในระดับไมโครวินาที ฐานข้อมูลจึงทำงานน้อยลงมาก'],
      groups: [],
      nodes: [N('app', 6, 38, 74, 36, ['App', 'แอป'], 'compute', 'server'), N('c', 128, 6, 112, 42, ['Cache in memory\nElastiCache / DAX', 'แคชในหน่วยความจำ\nElastiCache / DAX'], 'db', 'bolt', /elasticache|\bdax\b|cach|redis|valkey|memcached/i),
        N('db', 128, 66, 112, 40, ['Database', 'ฐานข้อมูล'], 'db', 'database', /^(amazon )?(rds|aurora)\b/i)],
      edges: [E('app', 'c', ['1. check here', '1. ดูที่นี่ก่อน'], { at: [62, 26] }), E('app', 'db', ['2. on a miss', '2. ถ้าไม่มี'], { dash: true, at: [98, 96] })] },

    sqs: { h: 126, cap: ['The queue absorbs traffic spikes so nothing is lost, and consumers work at their own pace. Messages that keep failing go to a dead-letter queue.', 'คิวรับปริมาณที่พุ่งขึ้นไว้ ไม่มีอะไรหาย ผู้ประมวลผลทำงานตามจังหวะของตัวเอง ข้อความที่ล้มเหลวซ้ำๆ จะไปอยู่ใน dead-letter queue'],
      groups: [],
      nodes: [N('p', 6, 30, 74, 40, ['Producers\n(web tier)', 'ผู้ส่ง\n(เว็บ)'], 'compute', 'server'), N('q', 108, 26, 104, 48, ['SQS queue\nholds messages', 'คิว SQS\nพักข้อความ'], 'int', 'inbox', /\bsqs\b|queue/i),
        N('c', 240, 30, 74, 40, ['Consumers\n(scale out)', 'ผู้ประมวลผล\n(ขยายได้)'], 'compute', 'server'), N('dlq', 108, 94, 104, 26, 'Dead-letter queue', 'int', '', /dead-letter|\bdlq\b/i)],
      edges: [E('p', 'q'), E('q', 'c'), E('q', 'dlq', '', { dash: true })] },

    fanout: { h: 134, cap: ['Each message published to the topic is copied to every subscriber, so each system processes it on its own.', 'ข้อความที่ส่งเข้า topic จะถูกคัดลอกไปยังผู้สมัครรับทุกราย แต่ละระบบจึงประมวลผลแยกกันได้'],
      groups: [],
      nodes: [N('pub', 6, 48, 70, 38, ['Publisher', 'ผู้ส่ง'], 'compute', 'server'), N('t', 104, 44, 88, 46, 'SNS topic', 'int', 'bell', /\bsns\b|fan-?out|topic|pub\/sub/i),
        N('a', 224, 6, 90, 30, 'SQS queue A', 'int'), N('b', 224, 52, 90, 30, 'SQS queue B', 'int'), N('c', 224, 98, 90, 30, ['Email / Lambda', 'อีเมล / Lambda'], 'int')],
      edges: [E('pub', 't'), E('t', 'a'), E('t', 'b'), E('t', 'c')] },

    event: { h: 104, cap: ['Nothing runs until an event happens, and you pay only while the code runs.', 'ไม่มีอะไรทำงานจนกว่าจะมี event และจ่ายเงินเฉพาะตอนที่โค้ดทำงาน'],
      groups: [],
      nodes: [N('src', 6, 30, 70, 44, ['Event\ne.g. S3 upload', 'Event\nเช่น อัปโหลด\nไฟล์ S3'], 'storage', 'inbox', /event notification|s3 event/i), N('eb', 88, 30, 76, 44, ['EventBridge\nrule', 'EventBridge\nrule'], 'int', 'activity', /eventbridge|scheduler|cron/i),
        N('fn', 176, 30, 66, 44, 'Lambda', 'compute', 'bolt', /lambda|serverless|function/i), N('db', 254, 30, 60, 44, ['DynamoDB', 'DynamoDB'], 'db')],
      edges: [E('src', 'eb'), E('eb', 'fn'), E('fn', 'db')] },

    storage3: { h: 130, cap: ['Block = a disk for one instance. File = a shared folder for many. Object = files reached over an API from anywhere. Instance store is a temporary disk lost when the instance stops.', 'Block = ดิสก์ของ instance เดียว, File = โฟลเดอร์ที่ใช้ร่วมกันหลายเครื่อง, Object = ไฟล์ที่เข้าถึงผ่าน API จากที่ไหนก็ได้ ส่วน instance store เป็นดิสก์ชั่วคราวที่หายเมื่อ instance หยุด'],
      groups: [],
      nodes: [N('ebs', 6, 6, 98, 42, ['EBS · block\none instance', 'EBS · block\ninstance เดียว'], 'storage', '', /\bebs\b|block|io2|gp3|gp2|st1|sc1|instance store/i),
        N('efs', 111, 6, 98, 42, ['EFS / FSx · file\nmany instances', 'EFS / FSx · file\nหลาย instance'], 'storage', '', /\befs\b|\bfsx\b|file system|nfs|smb/i),
        N('s3', 216, 6, 98, 42, ['S3 · object\nany app, via API', 'S3 · object\nทุกแอปผ่าน API'], 'storage', 'inbox', /^(amazon )?s3$|object storage/i),
        N('i1', 29, 88, 52, 28, 'EC2', 'compute'), N('i2', 113, 88, 28, 28, 'EC2', 'compute'), N('i3', 146, 88, 28, 28, 'EC2', 'compute'), N('i4', 179, 88, 28, 28, 'EC2', 'compute'),
        N('ap', 228, 88, 74, 28, ['Apps, users', 'แอป, ผู้ใช้'], 'user')],
      edges: [E('ebs', 'i1'), E('efs', 'i2'), E('efs', 'i3'), E('efs', 'i4'), E('s3', 'ap', 'API')] },

    s3classes: { h: 186, cap: ['Lower in the list = cheaper to store but slower or costlier to read. Lifecycle rules move objects down as they age.', 'ยิ่งอยู่ล่าง ยิ่งเก็บถูกแต่เรียกอ่านช้าหรือแพงขึ้น Lifecycle rule ย้ายอ็อบเจกต์ลงไปตามอายุ'],
      groups: [],
      nodes: [
        N('a', 6, 4, 308, 22, ['S3 Standard · frequent use · milliseconds', 'S3 Standard · ใช้บ่อย · มิลลิวินาที'], 'storage', '', /^(amazon )?s3 standard$/i),
        N('b', 6, 30, 308, 22, ['Intelligent-Tiering · moves objects for you', 'Intelligent-Tiering · ย้ายชั้นให้เอง'], 'storage', '', /intelligent-tiering/i),
        N('c', 6, 56, 308, 22, ['Standard-IA · monthly use · retrieval fee', 'Standard-IA · ใช้เดือนละครั้ง · มีค่าเรียกคืน'], 'storage', '', /standard-ia|standard-infrequent/i),
        N('d', 6, 82, 308, 22, ['One Zone-IA · one AZ only · re-creatable data', 'One Zone-IA · AZ เดียว · ข้อมูลที่สร้างใหม่ได้'], 'storage', '', /one zone/i),
        N('e', 6, 108, 308, 22, ['Glacier Instant Retrieval · quarterly · milliseconds', 'Glacier Instant Retrieval · รายไตรมาส · มิลลิวินาที'], 'storage', '', /glacier instant/i),
        N('f', 6, 134, 308, 22, ['Glacier Flexible Retrieval · minutes to hours', 'Glacier Flexible Retrieval · นาทีถึงชั่วโมง'], 'storage', '', /glacier flexible/i),
        N('g', 6, 160, 308, 22, ['Glacier Deep Archive · up to 12 hours · cheapest', 'Glacier Deep Archive · ถึง 12 ชั่วโมง · ถูกที่สุด'], 'storage', '', /deep archive/i)],
      edges: [] },

    dr: { h: 112, cap: ['From left to right: faster recovery (lower RTO and RPO), but more cost because more is running all the time.', 'จากซ้ายไปขวา: กู้คืนเร็วขึ้น (RTO และ RPO ต่ำลง) แต่แพงขึ้น เพราะมีระบบรันอยู่ตลอดมากขึ้น'],
      groups: [],
      nodes: [N('b', 6, 8, 72, 44, ['Backup &\nrestore', 'Backup &\nrestore'], 'plain', '', /backup and restore|backup & restore/i), N('p', 85, 8, 72, 44, ['Pilot\nlight', 'Pilot\nlight'], 'plain', '', /pilot light/i),
        N('w', 164, 8, 72, 44, ['Warm\nstandby', 'Warm\nstandby'], 'plain', '', /warm standby/i), N('a', 243, 8, 71, 44, ['Multi-site\nactive/active', 'Multi-site\nactive/active'], 'plain', '', /active\/active|multi-site/i)],
      lines: [{ x1: 10, y1: 76, x2: 310, y2: 76, t: ['hours down, $  →  seconds down, $$$$', 'หยุดหลายชั่วโมง $  →  หยุดไม่กี่วินาที $$$$'] }],
      edges: [] },

    role: { h: 176, cap: ['A role hands out temporary credentials that expire on their own, so there are no long-term keys to leak.', 'Role ให้ข้อมูลล็อกอินชั่วคราวที่หมดอายุเอง จึงไม่มีคีย์ระยะยาวให้รั่วไหล'],
      groups: [],
      nodes: [N('who', 80, 4, 160, 34, ['EC2, Lambda\nor a person', 'EC2, Lambda\nหรือผู้ใช้'], 'compute', 'server'),
        N('r', 80, 62, 160, 48, ['IAM role\ntemporary credentials\nfrom STS', 'IAM role\nข้อมูลล็อกอินชั่วคราว\nจาก STS'], 'sec', 'key', /iam role|role|assume|\bsts\b|instance profile|temporary|federat|identity pool/i),
        N('res', 80, 136, 160, 34, ['S3, DynamoDB,\nother services', 'S3, DynamoDB,\nบริการอื่น'], 'storage')],
      edges: [E('who', 'r', ['assumes', 'assume']), E('r', 'res', ['allowed actions', 'ทำตามสิทธิ์'])] },

    kms: { h: 122, cap: ['Envelope encryption: data is encrypted locally with a data key, and KMS only protects that small key. KMS keys never leave KMS.', 'Envelope encryption: เข้ารหัสข้อมูลในเครื่องด้วย data key แล้ว KMS ปกป้องเฉพาะคีย์เล็กๆ นั้น KMS key ไม่เคยออกจาก KMS'],
      groups: [],
      nodes: [N('k', 6, 40, 84, 42, ['KMS key\nstays in KMS', 'KMS key\nอยู่ใน KMS'], 'sec', 'key', /\bkms\b|customer managed|cmk|key policy|rotation/i),
        N('dk', 118, 6, 86, 36, 'Data key', 'sec', 'key', /data key|envelope|generatedatakey/i), N('edk', 118, 80, 86, 36, ['Encrypted\ndata key', 'Data key\nที่เข้ารหัส'], 'sec'),
        N('d', 232, 40, 82, 42, ['Your data\n(encrypted)', 'ข้อมูลของคุณ\n(เข้ารหัส)'], 'storage', 'inbox')],
      edges: [E('k', 'dk', ['creates', 'สร้าง'], { at: [56, 30] }), E('k', 'edk', ['wraps', 'ห่อหุ้ม'], { at: [56, 100] }), E('dk', 'd', ['encrypts', 'เข้ารหัส'], { at: [268, 30] }), E('edk', 'd', ['stored with', 'เก็บคู่กัน'], { dash: true, at: [268, 100] })] },

    kinesis: { h: 120, cap: ['Many consumers read the same ordered stream in real time. Data is kept (24 hours by default) so it can be read again.', 'ผู้อ่านหลายรายอ่านสตรีมเดียวกันตามลำดับแบบเรียลไทม์ ข้อมูลถูกเก็บไว้ (24 ชั่วโมงโดยค่าเริ่มต้น) จึงอ่านซ้ำได้'],
      groups: [],
      nodes: [N('p', 6, 38, 70, 42, ['Producers\nclicks, IoT', 'ผู้ส่ง\nคลิก, IoT'], 'compute', 'server'),
        N('ks', 94, 30, 102, 58, ['Kinesis Data\nStreams\nshards · replay', 'Kinesis Data\nStreams\nshard · อ่านซ้ำได้'], 'data', 'activity', /kinesis data streams|kinesis|shard|stream/i),
        N('l', 214, 4, 100, 30, 'Lambda', 'compute'), N('f', 214, 44, 100, 30, 'Data Firehose → S3', 'data', '', /firehose/i), N('a', 214, 84, 100, 30, ['Other apps', 'แอปอื่น'], 'compute')],
      edges: [E('p', 'ks'), E('ks', 'l'), E('ks', 'f'), E('ks', 'a')] },

    datalake: { h: 132, cap: ['Keep raw data cheaply in S3, describe it in the Glue Data Catalog, then query it where it is.', 'เก็บข้อมูลดิบใน S3 ราคาถูก อธิบายโครงสร้างไว้ใน Glue Data Catalog แล้วค้นหาจากที่เดิมได้เลย'],
      groups: [],
      nodes: [N('src', 6, 44, 68, 42, ['Sources\nDBs, apps', 'แหล่งข้อมูล\nDB, แอป'], 'user', 'database'), N('s3', 90, 44, 80, 42, ['S3\ndata lake', 'S3\ndata lake'], 'storage', 'inbox', /data lake|lake formation|^(amazon )?s3$/i),
        N('g', 186, 4, 128, 32, ['Glue · ETL + catalog', 'Glue · ETL + catalog'], 'data', '', /\bglue\b|crawler|data catalog|databrew/i), N('at', 186, 48, 128, 32, ['Athena · SQL on S3', 'Athena · SQL บน S3'], 'data', '', /athena/i),
        N('rs', 186, 92, 128, 32, ['Redshift · QuickSight', 'Redshift · QuickSight'], 'data', '', /redshift|quicksight|emr/i)],
      edges: [E('src', 's3'), E('s3', 'g'), E('s3', 'at'), E('s3', 'rs')] },

    rag: { h: 150, cap: ['Retrieval-augmented generation: the model answers from your own, up-to-date documents without being retrained, and can cite them.', 'Retrieval-augmented generation: โมเดลตอบจากเอกสารของคุณที่อัปเดตอยู่เสมอ โดยไม่ต้องเทรนใหม่ และอ้างอิงแหล่งที่มาได้'],
      groups: [],
      nodes: [N('docs', 6, 6, 66, 34, ['Documents', 'เอกสาร'], 'storage', 'inbox'), N('ch', 84, 6, 66, 34, ['Chunks', 'ชิ้นข้อความ'], 'ai', '', /chunk/i),
        N('em', 162, 6, 70, 34, ['Embeddings', 'Embedding'], 'ai', '', /embedding/i), N('vs', 244, 6, 70, 34, ['Vector\nstore', 'Vector\nstore'], 'db', 'database', /vector|opensearch|pgvector/i),
        N('q', 6, 98, 66, 44, ['Question', 'คำถาม'], 'user', 'user'), N('rt', 92, 98, 92, 44, ['Retrieve\nrelevant chunks', 'ดึงชิ้นที่\nเกี่ยวข้อง'], 'ai', '', /retriev|knowledge base|\brag\b/i),
        N('fm', 202, 98, 112, 44, ['Foundation model\nanswers from them', 'Foundation model\nตอบจากชิ้นเหล่านั้น'], 'ai', 'sparkle', /foundation model|bedrock|\bllm\b/i)],
      edges: [E('docs', 'ch'), E('ch', 'em'), E('em', 'vs'), E('q', 'rt'), E('vs', 'rt', ['search', 'ค้นหา']), E('rt', 'fm')] },

    mllife: { h: 116, cap: ['Most of the work is in the data. Monitoring catches drift, and the model is retrained.', 'งานส่วนใหญ่อยู่ที่ข้อมูล การเฝ้าดูช่วยจับ drift แล้วจึงเทรนโมเดลใหม่'],
      groups: [],
      nodes: [N('d', 6, 6, 96, 40, ['Collect + label\n(Ground Truth)', 'เก็บ + ติดป้าย\n(Ground Truth)'], 'ai', '', /ground truth|label/i), N('p', 112, 6, 96, 40, ['Prepare\nfeatures', 'เตรียม\nfeature'], 'ai', '', /feature|data wrangler|preprocess/i),
        N('t', 218, 6, 96, 40, ['Train\nhyperparameters', 'เทรน\nhyperparameter'], 'ai', '', /train|hyperparameter|epoch|fine-tun/i), N('e', 218, 70, 96, 40, ['Evaluate\nmetrics', 'ประเมินผล\nเมตริก'], 'ai', '', /evaluat|accuracy|precision|recall|\bf1\b|rmse|overfit|underfit|confusion/i),
        N('dp', 112, 70, 96, 40, ['Deploy\ninference', 'Deploy\ninference'], 'ai', '', /deploy|inference|endpoint|batch transform/i), N('m', 6, 70, 96, 40, ['Monitor\ndrift', 'เฝ้าดู\ndrift'], 'ai', '', /monitor|drift/i)],
      edges: [E('d', 'p'), E('p', 't'), E('t', 'e'), E('e', 'dp'), E('dp', 'm'), E('m', 'd', '', { dash: true })] },

    aiservices: { h: 156, cap: ['Ready-made AI services: send data through an API and get results, with no model to train.', 'บริการ AI สำเร็จรูป: ส่งข้อมูลผ่าน API แล้วได้ผลลัพธ์ ไม่ต้องเทรนโมเดล'],
      groups: [],
      nodes: [N('a', 6, 4, 151, 32, ['Images, video → Rekognition', 'ภาพ, วิดีโอ → Rekognition'], 'ai', '', /rekognition/i), N('b', 163, 4, 151, 32, ['Scanned docs → Textract', 'เอกสารสแกน → Textract'], 'ai', '', /textract/i),
        N('c', 6, 42, 151, 32, ['Text meaning → Comprehend', 'วิเคราะห์ข้อความ → Comprehend'], 'ai', '', /comprehend/i), N('d', 163, 42, 151, 32, ['Other languages → Translate', 'ภาษาอื่น → Translate'], 'ai', '', /translate/i),
        N('e', 6, 80, 151, 32, ['Speech → text: Transcribe', 'เสียง → ข้อความ: Transcribe'], 'ai', '', /transcribe/i), N('f', 163, 80, 151, 32, ['Text → speech: Polly', 'ข้อความ → เสียง: Polly'], 'ai', '', /polly/i),
        N('g', 6, 118, 151, 32, ['Chatbots → Lex', 'แชตบอต → Lex'], 'ai', '', /\blex\b/i), N('h', 163, 118, 151, 32, ['Search documents → Kendra', 'ค้นหาเอกสาร → Kendra'], 'ai', '', /kendra|personalize/i)],
      edges: [] },

    pricing: { h: 134, cap: ['Steady, always-on load → commit for 1–3 years. Interruptible jobs → Spot. Short or unpredictable → On-Demand.', 'โหลดคงที่ตลอด → ผูกมัด 1–3 ปี งานที่หยุดได้ → Spot งานสั้นหรือคาดเดาไม่ได้ → On-Demand'],
      groups: [],
      nodes: [N('od', 6, 6, 151, 58, ['On-Demand\nno commitment\nfull price', 'On-Demand\nไม่ผูกมัด\nราคาเต็ม'], 'compute', '', /on-demand/i),
        N('sp', 163, 6, 151, 58, ['Savings Plans, RIs\n1 or 3 years\nup to ~72% off', 'Savings Plans, RI\n1 หรือ 3 ปี\nลดได้ถึง ~72%'], 'compute', '', /savings plan|reserved/i),
        N('spot', 6, 70, 151, 58, ['Spot\nspare capacity, up to 90% off\ncan be interrupted', 'Spot\nความจุเหลือ ลดได้ถึง 90%\nถูกเรียกคืนได้'], 'compute', '', /\bspot\b/i),
        N('ded', 163, 70, 151, 58, ['Dedicated Hosts\na server just for you\nlicences, compliance', 'Dedicated Hosts\nเซิร์ฟเวอร์ของคุณเอง\nไลเซนส์, compliance'], 'compute', '', /dedicated/i)],
      edges: [] },

    cicd: { h: 104, cap: ['Every change goes through the same automatic build, test and deploy steps, so releases are repeatable.', 'ทุกการเปลี่ยนแปลงผ่านขั้นตอน build, test และ deploy อัตโนมัติแบบเดียวกัน การปล่อยเวอร์ชันจึงทำซ้ำได้'],
      groups: [G(6, 6, 308, 92, 'CodePipeline', 'solid', /codepipeline|pipeline/i)],
      nodes: [N('s', 16, 34, 84, 44, ['Source\nGit repo', 'Source\nGit repo'], 'plain', 'code'), N('b', 118, 34, 84, 44, ['CodeBuild\nbuild + test', 'CodeBuild\nbuild + test'], 'compute', '', /codebuild|buildspec/i),
        N('d', 220, 30, 84, 52, ['CodeDeploy\nin-place or\nblue/green', 'CodeDeploy\nin-place หรือ\nblue/green'], 'compute', '', /codedeploy|blue\/green|canary|appspec|linear/i)],
      edges: [E('s', 'b'), E('b', 'd')] },

    monitor: { h: 132, cap: ['CloudWatch = how resources perform. CloudTrail = who did what (API calls). Config = how resources are configured over time.', 'CloudWatch = ทรัพยากรทำงานอย่างไร, CloudTrail = ใครทำอะไร (การเรียก API), Config = การตั้งค่าเปลี่ยนไปอย่างไร'],
      groups: [],
      nodes: [N('r', 6, 46, 72, 40, ['Your\nresources', 'ทรัพยากร\nของคุณ'], 'compute', 'server'),
        N('cw', 96, 4, 102, 42, ['CloudWatch\nmetrics + logs', 'CloudWatch\nเมตริก + ล็อก'], 'mgmt', 'activity', /cloudwatch|metric|logs? insights|dashboard/i), N('al', 214, 4, 100, 42, ['Alarm →\nSNS, Auto Scaling', 'Alarm →\nSNS, Auto Scaling'], 'mgmt', 'bell', /alarm/i),
        N('ct', 96, 86, 102, 42, ['CloudTrail\nwho called which API', 'CloudTrail\nใครเรียก API อะไร'], 'mgmt', '', /cloudtrail|api call|audit/i), N('cf', 214, 86, 100, 42, ['Config\nsettings history', 'Config\nประวัติการตั้งค่า'], 'mgmt', '', /\bconfig\b/i)],
      edges: [E('r', 'cw'), E('cw', 'al'), E('r', 'ct'), E('ct', 'cf', '', { none: true })] },

    orgs: { h: 140, cap: ['SCPs set the most that any account below them may do. Billing for every account is combined at the top.', 'SCP กำหนดขอบเขตสูงสุดที่บัญชีด้านล่างทำได้ และค่าใช้จ่ายของทุกบัญชีรวมกันที่ด้านบน'],
      groups: [],
      nodes: [N('root', 70, 4, 112, 34, ['Organization\nmanagement account', 'Organization\nบัญชีจัดการ'], 'mgmt', '', /organizations|consolidated billing|management account|control tower/i),
        N('scp', 196, 4, 118, 34, ['SCP guardrail\ne.g. deny Regions', 'SCP guardrail\nเช่น ห้ามบาง Region'], 'sec', 'shield', /\bscps?\b|service control/i),
        N('o1', 24, 56, 110, 28, 'OU: Production', 'mgmt'), N('o2', 186, 56, 110, 28, 'OU: Sandbox', 'mgmt'),
        N('a1', 6, 106, 70, 28, ['Account', 'บัญชี'], 'plain'), N('a2', 84, 106, 70, 28, ['Account', 'บัญชี'], 'plain'), N('a3', 166, 106, 70, 28, ['Account', 'บัญชี'], 'plain'), N('a4', 244, 106, 70, 28, ['Account', 'บัญชี'], 'plain')],
      edges: [E('root', 'o1'), E('root', 'o2'), E('scp', 'o2', '', { dash: true }), E('o1', 'a1'), E('o1', 'a2'), E('o2', 'a3'), E('o2', 'a4')] },
  };

  // Which diagram a question gets: the first rule that matches its text plus its right answer.
  const RULES = [
    ['rag', /\brag\b|retrieval-augmented|knowledge bases?|embedding|vector (store|database|search)|\bchunk/i],
    ['aiservices', /rekognition|textract|comprehend|transcribe|polly|amazon lex|kendra|amazon translate|personalize/i],
    ['mllife', /sagemaker|ground truth|hyperparameter|overfit|underfit|data drift|model monitor|feature store|training data|labeled/i],
    ['kms', /\bkms\b|envelope encryption|data key|customer managed key/i],
    ['role', /iam role|assumerole|assume (a |the |an )?role|\bsts\b|instance profile|temporary credentials|identity pool/i],
    ['orgs', /organizations|\bscps?\b|service control polic|control tower|consolidated billing|organizational unit/i],
    ['shared', /shared responsibility|who is responsible|aws is responsible|customer is responsible/i],
    ['sgnacl', /security groups?|network acls?|\bnacls?\b/i],
    ['endpoint', /vpc endpoint|gateway endpoint|interface endpoint|privatelink/i],
    ['vpc', /nat gateway|internet gateway|public subnet|private subnet|route table|egress-only/i],
    ['hybrid', /direct connect|site-to-site vpn|\bvpn\b/i],
    ['tgw', /transit gateway|vpc peering/i],
    ['cdn', /cloudfront|edge locations?/i],
    ['route53', /route 53|routing polic|failover routing|latency-based|weighted routing|geolocation routing/i],
    ['dr', /disaster recovery|pilot light|warm standby|backup and restore|\brto\b|\brpo\b|active\/active|multi-site/i],
    ['rds', /multi-az|read replicas?|standby|aurora replica/i],
    ['cache', /elasticache|\bdax\b|\bcach(e|ing)\b|redis|memcached/i],
    ['sqs', /\bsqs\b|dead-letter|message queue|decoupl|visibility timeout/i],
    ['fanout', /\bsns\b|fan-?out/i],
    ['kinesis', /kinesis|firehose|\bshards?\b|clickstream/i],
    ['pricing', /spot instances?|spot-based|reserved instances?|savings plans?|on-demand|dedicated hosts?/i],
    ['cicd', /codepipeline|codebuild|codedeploy|blue\/green|canary|deployment (strategy|policy|polic)|elastic beanstalk/i],
    ['monitor', /cloudwatch|cloudtrail|aws config|\balarms?\b/i],
    ['event', /eventbridge|\blambda\b|event-driven|event notification|step functions/i],
    ['datalake', /data lake|\bglue\b|athena|lake formation|redshift|\bemr\b|data catalog|crawler|parquet/i],
    ['s3classes', /glacier|intelligent-tiering|standard-ia|one zone-ia|storage class|lifecycle|deep archive/i],
    ['storage3', /\bebs\b|\befs\b|\bfsx\b|instance store|block storage|object storage|file system/i],
    ['haweb', /auto scaling|load balanc|\balb\b|\bnlb\b|health checks?/i],
    ['global', /availability zones?|local zones?|global infrastructure|regions? around the world|choosing an aws region/i],
  ];
  window.diagramFor = (text) => { for (const [id, re] of RULES) if (re.test(text)) return id; return null; };

  // ---- rendering ----
  const L = (t, th) => Array.isArray(t) ? (th ? t[1] : t[0]) : t;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const centre = n => [n.x + n.w / 2, n.y + n.h / 2];
  // Where the line from a's centre towards b's centre leaves a's box.
  function edgePoint(n, tx, ty) {
    const [cx, cy] = centre(n), dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return [cx, cy];
    const s = Math.min(dx ? (n.w / 2 + 2) / Math.abs(dx) : Infinity, dy ? (n.h / 2 + 2) / Math.abs(dy) : Infinity);
    return [cx + dx * s, cy + dy * s];
  }
  function textLines(lines, x, y, h, size, anchor, cls) {
    const lh = size * 1.25, top = y + h / 2 - (lines.length - 1) * lh / 2 + size * 0.35;
    return lines.map((l, i) => `<text x="${x}" y="${(top + i * lh).toFixed(1)}" font-size="${size}" text-anchor="${anchor}" class="${cls}">${esc(l)}</text>`).join('');
  }
  let drawn = 0;
  window.renderDiagram = (id, opts = {}) => {
    const d = D[id]; if (!d) return '';
    const th = opts.lang === 'th', hl = String(opts.answer || '');
    const hit = m => !!(m && hl && m.test(hl));
    const nodes = Object.fromEntries(d.nodes.map(n => [n.id, n]));
    // Arrowhead ids must be unique per drawing: a url(#id) pointing into a hidden diagram draws nothing.
    const uid = 'dg-a' + (++drawn);
    let out = '';
    for (const g of d.groups) {
      out += `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="10" class="dg-group ${g.s === 'solid' ? 'solid' : ''} ${hit(g.m) ? 'dg-hl' : ''}"/>`
        + `<text x="${g.x + 8}" y="${g.y + 13}" font-size="9" class="dg-glabel">${esc(L(g.t, th))}</text>`;
    }
    for (const l of d.lines || []) {
      out += `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" class="dg-edge" marker-end="url(#${uid})"/>`
        + `<text x="${(l.x1 + l.x2) / 2}" y="${l.y1 + 16}" font-size="9" text-anchor="middle" class="dg-elabel">${esc(L(l.t, th))}</text>`;
    }
    for (const e of d.edges) {
      const a = nodes[e.a], b = nodes[e.b]; if (!a || !b) continue;
      const [bx, by] = centre(b), [ax, ay] = centre(a);
      const [x1, y1] = edgePoint(a, bx, by), [x2, y2] = edgePoint(b, ax, ay);
      out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="dg-edge ${e.o.dash ? 'dash' : ''}"`
        + (e.o.none ? '' : ` marker-end="url(#${uid})"`) + (e.o.both ? ` marker-start="url(#${uid}s)"` : '') + '/>';
      const [lx, ly] = e.o.at || [(x1 + x2) / 2, (y1 + y2) / 2 - 3];
      if (e.t) out += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="8.5" text-anchor="middle" class="dg-elabel">${esc(L(e.t, th))}</text>`;
    }
    for (const n of d.nodes) {
      const lines = String(L(n.t, th)).split('\n');
      // Rough text width (about 5.5px a character at this size): skip the icon when it would push the text out of the box.
      const roomy = Math.max(...lines.map(l => l.length)) * 5.5 + 28 <= n.w;
      const icon = n.i && roomy && window.ICON ?window.ICON(n.i).replace('<svg ', `<svg x="${n.x + 7}" y="${n.y + n.h / 2 - 7}" `).replace('width="1em" height="1em"', 'width="14" height="14"') : '';
      const tx = icon ? n.x + 25 : n.x + n.w / 2;
      out += `<g class="dg-node dg-${n.c} ${hit(n.m) ? 'dg-hl' : ''}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="7" class="dg-box"/>`
        + `<rect x="${n.x}" y="${n.y + 4}" width="3" height="${n.h - 8}" rx="1.5" class="dg-bar"/>${icon}`
        + textLines(lines, tx, n.y, n.h, n.h < 26 ? 9 : 9.5, icon ? 'start' : 'middle', 'dg-text') + '</g>';
    }
    const defs = `<defs><marker id="${uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="dg-head"/></marker>`
      + `<marker id="${uid}s" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M10,0 L0,5 L10,10 z" class="dg-head"/></marker></defs>`;
    return `<figure class="diagram"><svg viewBox="0 0 ${W} ${d.h}" role="img" aria-label="${esc(L(d.cap, th))}">${defs}${out}</svg>`
      + `<figcaption>${esc(L(d.cap, th))}</figcaption></figure>`;
  };
  window.DIAGRAM_IDS = Object.keys(D);
})();

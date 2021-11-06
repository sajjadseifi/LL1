let nltbl:TableSteps<boolean>;
let frstbl:TableSteps<string[]>;
let flwtbl:TableSteps<string[]>;

interface Array<T> {
    push_uniq<T>(data:T) : boolean;
    index_data<T>(data:T) : number;
}
interface String {
    is_whitespace(pos:number):boolean;
    skip_whitespace(pos:number):number;
    out_of_bound(pos:number):boolean;
}

Array.prototype.push_uniq= function(data):boolean {
    if(this.findIndex(a=>a === data) != -1) 
        return false;

    this.push(data);

    return true;
}

Array.prototype.index_data= function(data):number {
    return this.findIndex(itm=> itm === data)
}

String.prototype.out_of_bound = function(pos:number): boolean {
    return  pos >= this.length;
}

String.prototype.is_whitespace = function(pos:number): boolean {

    if(this.out_of_bound(pos)) 
        return false;

    let c = this[pos];
    return (
        c === ' '  ||
        c === '\t' ||
        c === '\n' ||
        c === '\r'
    );
}

String.prototype.skip_whitespace = function(pos:number):number{
    if(this.out_of_bound(pos)) return pos;

    while(this.is_whitespace(pos))
        pos += 1;

    return pos;
}

interface IRule{
    state:string;
    toks:string[];
}

class Rule implements IRule {
    toks:string[];
    constructor( public state : string, toks:string[]){
        this.toks = toks;
    }
}

interface ICfg{
    uniq_states:string[],
    rules:IRule[],
    add_rule(state:string,...toks:string[]):void;   
    rm_rule(rule:Rule) :Rule | null;
    rm_rule_by_index(index:number):Rule | null;
    get terminals():string[];
}

class Cfg implements ICfg  {
    uniq_states:string[];
    constructor(public rules: IRule[]=[]){
        this.uniq_states=[];
        this.init();
    }
    init()
    {
        for (const r of this.rules) {  
            if(this.uniq_states.find(str=> str == r.state))
                continue;            
            this.uniq_states.push(r.state);
        }
    }
    is_state(expr:string):boolean
    {
        return this.uniq_states.findIndex(s=>s==expr) != -1;
    }
    add_rule(state:string,...toks:string[])
    {   
        const rule = new Rule(state,toks);
        this.rules.push(rule);
        //add to uniq list
        if(!this.uniq_states.find(str=> str == state))
            this.uniq_states.push(state);
    }
    rm_rule(rule:Rule) :Rule | null
    {
        let len = this.rules.length;
        
        this.rules = this.rules.filter(r=>r !== rule);
        
        if(this.rules.length == len) return null;

        return rule;
    }
    rm_rule_by_index(index:number)
    {
        if (index < 0 || index > this.rules.length) return null;
        
        let rule = this.rules[index];

        this.rules = this.rules.filter((_,ind)=>ind !== index);
        
        return rule; 
    }
    join(new_rules: IRule[])
    {
        this.rules.concat(...new_rules);
    }
    print_rules(){
        this.rules.forEach(r => {
            console.log(`${r.state} -> ${r.toks.join("")}`);
        });
    }
    get terminals() : string[]{
        let trms : string[]= [];
        for (const rule of this.rules) {
            for (const tok of rule.toks) {
                if(this.is_state(tok)) continue;
                trms.push_uniq(tok);
            }
        }
        return trms;
    }
}

type StateTable<T>={
    state:string;
    data:T;
};

interface IStep<T> {
    cfg:ICfg;   
    states:StateTable<T>[];
    is_change:boolean;
    change_data(state:string,data:T):void;

}

class TableSteps<T> implements IStep<T> {
    states:StateTable<T>[];
    is_change:boolean;
    constructor(public cfg:ICfg,inital_value:T){
        this.is_change=false;
        this.states=[];
        this.init(inital_value);
    }
    init(data:T){
        for (const state of this.cfg.uniq_states) {
            let stttbl : StateTable<T> = { state,data };
            this.states.push(stttbl); 
        }
    }
    change_data(state:string,data:T){
        let index = this.states.findIndex(s=>`${s.state}` == `${state}`); 
        if(index == -1) return;
        
        if(!this.is_change) this.is_change = true; 
        
        this.states[index] = {
            ...this.states[index],
            data
        };
    }
    un_changed()
    {
        this.is_change = false;
    }
    table_state(state:string)
    {
        let sttl_index = this.states.findIndex(s=>s.state == state);        
        if(sttl_index == -1) return null;

        return this.states[sttl_index];
    }
    execute(cb:(cfg:ICfg,table : TableSteps<T>,rule_index : number)=>void): TableSteps<T> {
        let rules = this.cfg.rules; 
        // let step = 0;
        while(true)
        {   
            for(let i=0; i < rules.length; i++) 
                cb(this.cfg,this,i);  

                this.un_changed();
            
            if(this.is_change == false) break;
            // step++;  
        }
        this.un_changed();

        return this;
    }
}

type Item = (number | number[] | null); 

interface ITableLL1 {

    column:string[];
    states:string[];
    matrix:Item[][];
    get(state:string,letter:string):Item;
    append(state:string,terminal:string,rule_number:number): boolean;
    remove_by_rule_number(state:string,terminal:string,rule_number:number): boolean;
    remove_all(state:string,terminal:string): boolean;
}

class TableLL1 implements ITableLL1{
    matrix: Item[][];
    constructor(public states:string[],public column:string[]){
        this.matrix = [];
        this.init();
    }
    init()
    {
        this.matrix = Array<Item[]>(this.states.length);
        for (let i = 0; i < this.states.length; i++) {
            this.matrix[i] = Array<Item>(this.column.length);
            for (let j = 0; j < this.column.length; j++) {
                this.matrix[i][j] = null;
            }
        }
    }
    pos(state:string,terminal:string):[number,number]{
        let row = this.states.index_data(state);
        let col = this.column.index_data(terminal);

        return [row,col];
    }
    get(state:string,terminal:string):Item
    {
        const [row,col] = this.pos(state,terminal);
        return this.matrix[row][col];
    }
    append(state:string,terminal:string,rule_number:number): boolean{
        const [row,col] = this.pos(state,terminal);

        if(row == -1 || col == -1) return false;
        let item = this.matrix[row][col];
        if(item === null){
            this.matrix[row][col] = rule_number;
        }
        else if(item instanceof Array){
            item.push_uniq(rule_number);
        }
        else {
            this.matrix[row][col] = [item,rule_number];
        }

        return true;
    }
    remove_by_rule_number(state:string,terminal:string,rule_number:number): boolean
    {
        return false;
    }
    remove_all(state:string,terminal:string): boolean
    {
        return false;
    }
}

interface ILL1 {
    cfg:ICfg;
    table:ITableLL1;
    stack:string[];
    analyze(src:string):void;
}

class LL1 implements ILL1 {
    stack:string[]=[];
    constructor(public cfg:Cfg,public table: ITableLL1){
    }
    init(){
        this.stack.push(this.cfg.uniq_states[0]);
    }
    append_toks_rule(rule_index:number){
        const rule = this.cfg.rules[rule_index];
        
        for (const tk of rule.toks.reverse())   
            this.stack.push(tk);
    }
    next_token(src:string,pos:number): [string,number]
    {   

        let token = "";
        //remove whitespace and set new position char to pos var
        pos = src.skip_whitespace(pos);
        //add character to token
        while(!src.out_of_bound(pos) && !src.is_whitespace(pos))
        {
            token += src[pos];
            pos++;
        } 
        return [token,pos];
    }
    analyze(src: string): void {
        console.log(`input source string : "${src}"`);
        let ch_pos:number = 0;
        this.init();

        while(true){
            if(this.stack.length == 0) break;
            let expr = this.next_token(src,ch_pos);
            //get last item in stack
            let item = this.stack.pop()!;
            if(this.cfg.is_state(item))
            {
                const rule_index = this.table.get(item,expr[0]);
                if(rule_index !== 0 && rule_index == null) {
                    break;
                }
                else if (rule_index instanceof Array)
                {
                    console.log("Due to the ambiguity in the grammar, it is not possible to parse the string",rule_index);
                    return;
                }

                this.append_toks_rule(rule_index);
                console.log(this.stack.join(" ")," | Expand ",rule_index);
                continue;
            }

            //check token last of stack with entry input...
            if(expr[0] != item) continue;
            if(this.stack.length == 0) break;

            ch_pos = expr[1];
            console.log(this.stack.join(" ")," | Shift ",item);
            
        }
        if(this.stack.length == 0) 
            console.log("Accepted.");
        else 
            console.log("Syntax Error");
        this.stack = [];
    }

    
}
//functionality 
const concat_uniq = (origin: string[],target: string[]) =>
{   
    const uniqq: string[] = [];
    let exist;
    for (const tar of target) {
        let exist = false;
        for (const org of origin) {
            if (tar == org) 
            {
                exist = true;
                break;
            }
        }
        if(!exist) uniqq.push(tar);
    }
    let updated = [...origin];

    if(uniqq.length > 0)
        updated = origin.concat(uniqq);
    return updated;
};

const nullable=(tbl : TableSteps<boolean>,index_state : number,data:boolean) : boolean =>{
    const  cfg= tbl.cfg;
    const rule = cfg.rules[index_state];
    
    if(data == true) return true;

    for (const expr of rule.toks) {
        //nullable just only to be expr is State and 
        let is_state = (cfg as Cfg).is_state(expr);
        //this is a terminal token
        if(!is_state) return false;
        //get state of tableState  for checking nullable is true 
        let sttl = tbl.table_state(expr)!;        
        //if table value of state is false then 
        if(sttl.data == false) return false;

    }
    //if toks length 0 nullable or passed loop statement 
    return true;
};

const first = (tbl : TableSteps<string[]>,index_state : number) : string[] =>{
    const  cfg= tbl.cfg;
    const rule = cfg.rules[index_state];
    let toks : string[] = [...tbl.table_state(rule.state)!.data];
    for (const expr of rule.toks) {
        //nullable just only to be expr is State and 
        let is_state = (cfg as Cfg).is_state(expr);

        //this is a terminal token
        if(!is_state) 
        {
            if (toks.findIndex(tk=>tk == expr) == -1)
                toks.push(expr);
            
            break;
        }
        //get state of tableState  for checking nullable is true 
        let sttl = tbl.table_state(expr)!;        
        //if size of data 0 this means no first on our list 
        if(sttl.data.length == 0) continue;
        //check sttl.data exist in the tok array 
        toks = concat_uniq(toks,sttl.data);
    } 
    
    return toks;
};

const firsts_toks = (cfg : ICfg,toks:string[],start_index:number) :string[]=>{
    let updated_tks:string[]=[];
    for (let i = start_index; i < toks.length; i++) {
        //tok is terminal this proccess stoped
        if((cfg as Cfg).is_state(toks[i]) == false){
            if(updated_tks.findIndex(u=>u == toks[i]) == -1)
                updated_tks.push(toks[i]);
            break;
        }
        //get state table
        let st_f = frstbl.table_state(toks[i])!;
        let st_n = nltbl.table_state(toks[i])!;

        //updated first token
        updated_tks = concat_uniq(updated_tks,st_f.data);
        
        //if state not nullable means follow stoped this section
        if(st_n.data == false) break;

    }
    return updated_tks;
};

const nullable_toks=(toks:string[],start_index:number):boolean=>{
    
    for (let i = start_index; i < toks.length; i++) {
        //get state table
        let sttl = nltbl.table_state(toks[i]);
        //if sttl null mean Tok is terminal
        if(sttl == null) return false;
        //if sttl not nullable condition faild
        if(!sttl.data) return false;
    }

    return true;
};

const nullable_table=(cfg : ICfg) : TableSteps<boolean>=>{
    const stp_table = new TableSteps<boolean>(cfg,false);
    let rules = stp_table.cfg.rules; 
    let step = 0;
    while(true)
    {
        stp_table.un_changed();
        for(let i=0; i < rules.length; i++){
            //get state on table nullable
            let sttl = stp_table.table_state(rules[i].state);
            //skip move to next if nullable true on prev cheking
            if(sttl!.data) continue;
            //check nullable
            let is_nullable = nullable(stp_table,i,sttl!.data);
            //if nullable gramer change data to true 
            if(is_nullable)
                stp_table.change_data(rules[i].state,true);
        }
        if(stp_table.is_change == false) break;
        step++;  
    }
    stp_table.un_changed();
    console.log("Nullale Table",stp_table.states);
    return stp_table;
};

const first_table =(cfg : ICfg) : TableSteps<string[]>=>{
    const stp_table = new TableSteps<string[]>(cfg,[]);
    let rules = stp_table.cfg.rules; 

    let step = 0;
    while(true)
    {   
        stp_table.un_changed();
        for(let i=0; i < rules.length; i++){
            //get state on table first
            let sttl = stp_table.table_state(rules[i].state);
            //stored size of data prev call first function
            let size = sttl?.data.length || 0;
            //get firss of data
            let _firsts : string[] = first(stp_table,i);
            //if nullable gramer change data to true 
            if(_firsts.length != size)
                stp_table.change_data(rules[i].state,_firsts);
        }

        if(stp_table.is_change == false) break;
        step++;  
    }
    stp_table.un_changed();
    console.log("First Table",stp_table.states);
    return stp_table;

};

const follow_table=(cfg : ICfg) : TableSteps<string[]>=>{
    const stp_table = new TableSteps<string[]>(cfg,[]);
    let rules = stp_table.cfg.rules; 
    let step = 0;
    while(true)
    {   
        stp_table.un_changed();
        for(let i=0; i < rules.length; i++){
            //get state on table follows
            for (let j=0; j < rules[i].toks.length; j++) {
                const tk = rules[i].toks[j];
                //stored state table for token state in right side
                const sttl_tok = stp_table.table_state(tk);
                //if token is state can be get follows
                if(sttl_tok == null) continue;
                
                const _follows = concat_uniq(sttl_tok.data,firsts_toks(cfg,rules[i].toks,j+1)); 
                const size = sttl_tok.data.length || 0;
                             
                if(_follows.length != size)
                    stp_table.change_data(tk,_follows);
                
                if(nullable_toks(rules[i].toks,j+1)){
                    const sttl = stp_table.table_state(rules[i].state);
                    //get follow of Variable
                    const _follows = concat_uniq(sttl_tok.data,sttl!.data);
                    //stored size of data prev call first function
                    const size = sttl_tok.data.length || 0;
                    //if nullable gramer change data to true                 
                    if(_follows.length != size)
                      stp_table.change_data(tk,_follows);
                }
            }
        }
        if(stp_table.is_change == false) break;
        step++;  
    }
    stp_table.un_changed();
    console.log("Follow Table",stp_table.states);
    return stp_table;
};

const ll1_table= (cfg : ICfg): TableLL1 =>{
    nltbl   = nullable_table(cfg);
    frstbl  = first_table(cfg);
    flwtbl  = follow_table(cfg);
    
    const ll1 = new TableLL1(cfg.uniq_states,cfg.terminals);
    
    for (let rule_index = 0; rule_index < cfg.rules.length; rule_index++) {
        const rule = cfg.rules[rule_index];
        //append firsts of rule on the table
        let ftoks = firsts_toks(cfg,rule.toks,0);

        for (const trm of ftoks) 
            ll1.append(rule.state,trm,rule_index);

        if(nullable_toks(rule.toks,0) == false) continue;
        //append follows of 
        const flwtoks = flwtbl.table_state(rule.state)! || [];

        for (const trm of flwtoks.data) 
            ll1.append(flwtoks.state,trm,rule_index);

    }
    return ll1; 
};
//gramers
const my_gram=():ICfg=>{
    const cfg = new Cfg();
    cfg.add_rule("S'","S","$");
    cfg.add_rule("S","D","O");
    cfg.add_rule("D","draw");
    cfg.add_rule("D");
    cfg.add_rule("O","circle");
    cfg.add_rule("O","box");
    cfg.add_rule("O");
    return cfg;
};

const init_gramer = (): ICfg =>{
    const cfg = new Cfg();
    cfg.add_rule("E","T","E'");
    cfg.add_rule("E'","+","T'","E");
    cfg.add_rule("E");
    cfg.add_rule("T", "F", "T'");
    cfg.add_rule("T'");
    cfg.add_rule("F", "(", "E", ")");
    cfg.add_rule("F", "int");
    return cfg;
};

//runable method
const run= ()=>{
    // let gises =init_gramer() as Cfg;
    let cfg = my_gram();
    console.log(cfg.uniq_states);
    let ll1_tbl = ll1_table(cfg);
    console.log(ll1_tbl);
    let ll1 = new LL1(cfg as Cfg,ll1_tbl);
    
    ll1.analyze("draw $");
    ll1.analyze("draw draw $");
    ll1.analyze("draw box box $");
};

run();

/***************************************************************************
 *
 *   ORM-HTML5 LGPL License
 *   Copyright JM Robles 2010 <roblesjm at gmail dot com>
 *
 *   This program is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *    This program is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 *
 *    You should have received a copy of the GNU Lesser General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 *
 **************************************************************************/
function DBM(dbName, dbVersion){
    this._isInit = false;
    this.dbName = dbName;
    if (dbVersion === undefined) {
        this.dbVersion = "1.0";
    }
    else {
        this.dbVersion = dbVersion;
        
    }
    
    // 
    this.init = function(){
        if (!window.openDatabase) {
            throw "no Web SQL support. Please use the last Google Chrome or Webkit engine";
        }
        // Create database
        db = window.openDatabase(this.dbName, this.dbVersion, this.dbName, 10 * 1024 * 1024);
        if (db == null || db == undefined) {
            throw "can't create database";
        }
        this.db = db;
        
    }
    
    this.init();
    
    
    
    
    // Register models
    this.registerModel = function(model,cb){
        try {
            eval("var o = new " + model + "({db: this,ddl:'ddl'})");
        } 
        catch (err) {
            throw "invalid model " + model + " - " + err;
        }
        
        // Create SQL DDL sentence
        var def = "";
        for (var i = 0; i < o._sqlFields.length; i++) {
            var f = o._sqlFields[i];
            var partial = f.field;
            // Type 
            switch (f.type) {
                case "s":{
                    partial += " varchar(255)";
                    break;
                }
                case "i":{
                    partial += " integer ";
                    break;
                }
                case "f":{
                    partial += " float ";
                    break;
                }
                case "o":{
                    partial += " integer ";
                    break;
                }
                case "r":{
                    partial += " blob ";
                    break;
                }
                case "b":{
                    partial += " boolean ";
                    break;
                }
                case "d":{
                    partial += " datetime ";
                    break;
                }
                default:
                    throw "not implemented DDL for : " + f.type;
            }
            // Flags
            if (f.flags.indexOf("n") != -1) {
                partial += " not null ";
            }
            if (f.flags.indexOf("u") != -1) {
                partial += " unique ";
            }
            
            
            def += ", " + partial;
        }
        
        var cons = "CREATE TABLE  IF NOT EXISTS " + o.tablename + " (id integer primary key " + def + " ,flush int(2) not null default 1)";
        
        this.execute(cons, [], function (tx,rs){
			// Predata?
			if (o.predata != undefined && o.predata.length > 0) {
			
				o._loadPredata(cb);
				
			}
			else {
				if (cb != undefined) {
					cb(o.tablename);
					
				}
			}
			
		}, function(tx, err){
            throw "error creating table with DDL " + cons;
            
        });
        
        
        
        
        
        
    }
	
	
    
    this.register = function(aModels,cb){
    
	    if ( aModels.length == 0)
		{
			
			if (cb != undefined)
				cb();
		}
		else{
			
			var m = aModels.shift();
			//console.log('register: '+ m);
			var ref = this;
			this.registerModel(m,function (model){
				//console.log('register end '+m);
				ref.register(aModels,cb);
				
			});
			
		}
		
		
		
    }
    
    this.execute = function(sql, params, cbOk, cbErr){
        cbOk = cbOk ||
        function(tx, rs){
        };
        cbErr = cbErr ||
        function(tx, err){
        };
        
        this.db.transaction(function(tx){
        
            tx.executeSql(sql, params, cbOk, cbErr);
        });
    }
    
    this._exportData = function(mode, model){
    
        if (model == undefined) {
            // Exportar todo
            return;
        }
        try {
            eval("var o = new " + model + "({db: this,ddl:'ddl'})");
        } 
        catch (err) {
            throw "invalid model " + model + " - " + err;
        }
        var cons = "SELECT * FROM " + o.tablename;
        this.execute(cons, [], function(tx, rs){
        
        
            if (mode == 'json') {
                var resp = 'data_' + o.tablename + ' = [ ';
                var partial = "";
                for (var i = 0; i < rs.rows.length; i++) {
                    partial += "{"
                    var item = rs.rows.item(i);
                    var extra = "";
                    for (var k in item) {
                        var val = "";
                        if (typeof(item[k]) == "number") {
                            val = item[k];
                        }
                        else 
                            if (typeof(item[k]) == "string") {
                                val = "'" + item[k] + "'";
                            }
                            else 
                                if (item[k] == null) {
                                    val = "null";
                                }
                        partial += extra + k + " : " + val;
                        extra = ", ";
                    }
                    partial += "},";
                }
                resp += partial + " ];";
                
                alert("allow POPUP!");
                WinId = window.open('', 'newwin', 'width=400,height=500');
                WinId.document.open();
                WinId.document.write(resp);
                WinId.document.close();
            }
            
        }, null);
        
    }
    
    this.exportDataAsJSON = function(model){
        this._exportData('json', model);
    }
    
    
    
}



/*********************
 *
 
 *  ModelBase is an "abstract" class. Every model in the system need to use in its constructor.
 *  Example:
 *
 *          function Client() {
 *          	this.base = new ModelBase()
 *          	this.base(tablename);
 *
 *          	// Here we define the fields type. With this structure, the base class create the necessary SQL.
 *          	// Syntax is simple:
 *          	//				('s' | 'f' | 'i' | 'd' | 'b' )['u']['n']<name (with the fist letter as capital)>
 *              //								or
 *              //					o['u']['n']<name (with the fist letter as capital)>:<table referenced>
 *
 *              this.fields = [ 'snName' , 'inAge' , 'suID', 'fWeight' , 'oCity:City ];
 *              this.init();
 *
 *
 *          }
 *
 */
function ModelBase(tablename){

    this.tablename = tablename;
    this.id = -1;
    
    
    // "Private"
    
    // utils
    // Utils
    this._isLower = function(ch){
        var lowers;
        
        lowers = "abcdefghijklmnopqrstuvwxyz";
        
        return (lowers.indexOf(ch) != -1);
    }
    
    this._isUpper = function(ch){
        var uppers;
        uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        
        return (uppers.indexOf(ch) != -1);
    }
    
    
    this._parseFields = function(){
        // Reset
        this._sqlFields = [];
        
        for (i in this.fields) {
            var f = this.fields[i];
            // Obtener el tipo
            var t = this._getTypeName(f);
            if (t == null) {
                throw "invalid specficacion: " + f;
            }
            
            if (t.type != "i" && t.type != "s" && t.type != "f" && t.type != "o" && t.type != "d" && t.type != "b" && t.type != "r") {
                throw "no type found for: " + f;
                
            }
            this._sqlFields.push(t);
        }
    }
    this._getTypeName = function(f){
        var i = 0;
        var p = 0;
        while (i < f.length && this._isLower(f[i])) {
            i++;
        }
        // Check flags
        var flag = "";
        var r = "";
        
        if (f.substring(0, i).length > 1) {
            flag = f.substring(1, i);
        }
        var t = f.substring(0, 1);
        var n = "";
        // Es un objeto?
        if (t == "o") {
            var sep = f.substring(i).indexOf(":");
            if (sep == -1) {
                throw "no reference model for: " + f.substring(i);
                
            }
            r = f.substring(i + sep + 1);
            n = f.substring(i, i + sep).toLowerCase();
            
        }
        else {
            n = f.substring(i).toLowerCase();
        }
        // Check flags
        
        for (var k = 0; k < flag.length; k++) {
        
            if ("nu".indexOf(flag[k]) == -1) {
                throw "invalid flag " + flag[k];
            }
        }
        
        if (i < f.length) {
            return {
                type: t,
                field: n,
                flags: flag,
                ref: r
            };
        }
        return null;
        
    }
    this._reflection = function(){
    
        for (i in this._sqlFields) {
            var t = this._sqlFields[i];
            // Getter y Setter
            
            eval("this.__defineGetter__(t.field,function()  {  return this._handlerGet('" + t.field + "','" + t.type + "','" + t.ref + "'); })");
            eval("this.__defineSetter__(t.field,function(value) {  this._handlerSet('" + t.field + "','" + t.type + "','" + t.flags + "','" + t.ref + "',value); })");
            
        }
    }
    this._handlerGet = function(field, type, ref){
        if (type == "o") {
            // Creamos un objet del tipo y lo devolvemos
            /*try {
                eval("var val = this._m_" + field);
            } 
            catch (err) {
                var val = null;
            }
            
            if (val == undefined || val == null) {
                return null;
            }
			if (val.id != -1)
			{
				return val;
			}
            eval("var ret = new " + ref + "(this.db)");
            ret.get(val);
            return ret;
            */
			return this._get_proxy(field,ref);
			
            
        }
        
        
        eval("var ret = this._m_" + field);
        if (ret == undefined || ret == null) {
            return ret;
        }
        if (type == "b") {
            return ret != 0 ? true : false;
        }
        else 
            if (type == "d") {
                return new Date(ret);
            }
        return ret;
        
    }
    this._handlerSet = function(field, type, flags, ref, value){
    
        // Comprobar tipo
        
        if (type == "o") {
        
			if ( flags.indexOf("n") != -1 && value == null )
			{
				throw "not null field";
			}
			if (value != null) {
				// Check type
				eval("var test = value instanceof " + ref);
				if (!test) 
					throw "no type " + ref;
				// Comprobar si tiene ID
                if (value.id == -1) {
                    throw "need save object before";
                }	
				
				eval("this._m_"+field+" = new ModelProxy(this.db,value.id,ref)");
				eval("this._m_"+field+".set(value)");
					
				
			}
			else
			{
				eval("this._m_"+field+" = new ModelProxy(this.db,-1,ref)");
			}
			
            /*if (flags.indexOf("n") != -1) {
            
                eval("var test = value instanceof " + ref);
                if (!test) 
                    throw "no type " + ref;
                // Comprobar si tiene ID
                if (value.id == -1) {
                    throw "need save object before";
                }
                value = value;
            }
            else {
                value = value || null;
            }
            */
            
        }
        else 
            if (type == "d") {
                if (!(value instanceof Date)) {
                    throw "Date object required";
                }
            }
            else 
                if (type == "b" && typeof(value) != "boolean") {
                    throw "excepted boolean value";
                }
                else 
                    if (type == "b") {
                        value = (value ? 1 : 0);
                    }
        
        if (typeof(value) == "number" && type == "s") {
            throw "number given, excepted string: " + field;
        }
        else 
            if (typeof(value) == "string" && type != "s" && type != "r") {
                throw "string given, excepted number: " + field;
            }
        
        if (type=="o") {
			if ( value == null)
			{
				value = null;
			}
			else{
				value = value.id;	
			}
			
		}
		else {
			eval("this._m_" + field + " = value");
		}
        
        // AutoUpdate
        if (this.id != -1) {
            // Realizar update
            if (type == "s" || type == "r" || type == "d") {
                value = "'" + value + "'";
            }
            
            var cons = "UPDATE " + this.tablename + " SET " + field + " = " + value + ", flush = 1 WHERE id = " + this.id;
            
            this.db.execute(cons, [], function(tx, res){
            }, function(tx, err){
            });
            
        }
        
        
    }
    this._getFieldsStr = function(){
    
        var fields = "";
        if (this._sqlFields == null || this._sqlFields.length == 0) 
            return null;
        fields = this._sqlFields[0].field;
        for (var i = 1; i < this._sqlFields.length; i++) {
            fields += "," + this._sqlFields[i].field;
        }
        return fields;
    }
    this._getValuesStr = function(){
        var partial = "";
        
        for (var i = 0; i < this._sqlFields.length; i++) {
            // Comprobar flags
            if (this._sqlFields[i].flags.indexOf("n") == -1) {
                partial += this._getPartialValueStr(this._sqlFields[i]);
                continue;
            }
            // Por ahora solo hay "not null"
            
            eval("var val = this._m_" + this._sqlFields[i].field);
            if (val == undefined) {
                return {
                    status: false,
                    msg: "field '" + this._sqlFields[i].field + "' is required"
                };
                
            }
            
            partial += this._getPartialValueStr(this._sqlFields[i]);
            
            
            
        }
        
        return {
            status: true,
            sql: partial
        };
        
        
    }
    
    this._getPartialValueStr = function(f){
    
        eval("var val = this._m_" + f.field);
        if (val == undefined) {
            return ",null";
        }
        
        if (f.type == "i" ) {
            eval("var ret = ',' + this._m_" + f.field);
            return ret;
            
        }
		else if (f.type == "o")
		{
			//eval("var ret = ',' + this._m_" + f.field+".id");
			var t = this._get_proxy(f.field,f.ref);
			var r = t._get();
			return r == null ? ",null" : (","+r.id);
		}
        else 
            if (f.type == "b") {
                eval("var ret = (this._m_" + f.field + " ? 1 :0)");
               
                
            }
            else {
                eval("var ret = ',\"' + this._m_" + f.field + "+ '\"'");
                
                return ret;
                
                
            }
        
    }
    
    this._loadPredata = function(cb){
    
    
    
        if (this.predata.length == 0) 
            return;
        
        for (var i = 0; i < this.predata.length; i++) {
            var values = "";
            var keys = "";
            var id = "";
            var flush = 0;
            
            for (var j in this.predata[i]) {
                if (j == 'id') {
                    id = this.predata[i][j];
                    continue;
                }
                if (j == 'flush') {
                    flush = this.predata[i][j];
                    continue;
                }
                
                var found = false;
                for (var k in this._sqlFields) {
                    if (this._sqlFields[k].field == j) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    throw "predata not field found: " + j;
                }
                keys += "," + j;
                
                
                
                if (typeof(this.predata[i][j]) == "string") {
                    values += ",'" + this.predata[i][j] + "'";
                }
                else 
                    if (typeof(this.predata[i][j]) == "boolean") {
                        values += "," + (this.predata[i][j] ? 1 : 0);
                    }
                    else {
                        values += "," + this.predata[i][j];
                    }
                
                
            }
            
            
            if (id == "") {
                throw "no id given";
            }
            
            var cons = "INSERT OR IGNORE INTO " + this.tablename + "(id" + keys + ",flush)" + " VALUES (" + id + values + "," + flush + ")";
           
            var ref = this;
			var num = 0;
			
            this.db.execute(cons, [], function(tx,rs){
				num++;
				if (num == ref.predata.length)
				{
					
					if (cb != undefined) {
						cb(ref.tablename);
						
					}
					
				}
				
			}, null);
            
        }
    }
    
    // Public
    // Initialize an instance
    this.init = function(data){
    
        if (data == undefined) {
            throw "not db specified";
            
        }
        if (data instanceof DBM) {
            var db = data;
            var ddl = undefined;
        }
        else {
            var db = data.db;
            var ddl = data.ddl;
        }
        
        this.db = db;
        this._parseFields();
        
        
        
        if (ddl != undefined && ddl == "ddl") {
            // Invocated by model register
            // Predata?
            /*
			if (this.predata != undefined) {
            
                this._loadPredata();
            }
            */
            
            return;
        }
        this._reflection();
        
        
        
        
        
    }
    
    // Save
    this.save = function(cb){
        var ref = this;
        var cb = cb || null;
        
        // Comprobar ID
        if (this.id == -1) {
            // INSERT
            var fields = this._getFieldsStr();
            var vFields = this._getValuesStr();
            if (!vFields.status) {
               
                return vFields;
                
            }
            
            // -- Construir la llamada
            var cons = "INSERT INTO " + this.tablename + " (id," + fields + ",flush) VALUES (null" + vFields.sql + ",1);";
            //alert(cons);
            this.db.execute(cons, [], function(tx, rs){
                // Establecer el ID
                ref.db.execute("SELECT id FROM " + ref.tablename + " WHERE rowid = ?", [rs.insertId], function(tx, rs){
                    // Establecer el ID
                    ref.id = rs.rows.item(0).id;
                    if (cb) {
                        cb();
                        
                    }
                }, function(tx, err){
                   
                });
                
            }, function(tx, err){
            
                throw "error save: " + err.message;
            });
            
        }
        else {
            // UPDATE
            // TODO: por ahora cada vez que se modifica una propiedad se realiza un update.
        
        
        
        }
        
    }
    
    this.get = function(arg, cb){
        var fields = "";
        fields = this._getFieldsStr();
        
        
        var cons = "SELECT id," + fields + " FROM " + this.tablename + " WHERE id = ?";
        
        var ref = this;
        this.db.execute(cons, [arg], function(tx, rs){
        
            if (rs.rows.length == 0) {
               
                return;
            }
            else {
                ref.id = rs.rows.item(0)['id'];
                // Establecer los datos
                for (var i = 0; i < ref._sqlFields.length; i++) {
                    eval("ref._m_" + ref._sqlFields[i].field + " = rs.rows.item(0)[ref._sqlFields[i].field]");
                    
                }
                
                if (cb != undefined) {
                
                    cb(ref);
                    
                }
                
                
            }
        }, function(tx, err){
        
         
        });
        
        
        
        
        
    }
    this.all = function(cb){
    
        this.filter({
            id__gt: 0
        }, cb);
        
    }
    
    this.filter = function(c, cb){
    
        var where = "";
        var isFirst = true;
        
        if (typeof(c) == "string") {
            where = c;
        }
        else {
            for (k in c) {
            
                // Split por campos
                var p = k.lastIndexOf("__");
                var flag = "";
                var field = "";
                var partial = "";
                if (p != -1) {
                    field = k.substring(0, p);
                    flag = k.substring(p + 2);
                }
                else {
                    field = k;
                }
                
                // Comprobar que existe el campo
                if (!this.hasOwnProperty(field)) {
                    throw "no field: " + field;
                }
                var tmpAr = this._sqlFields.slice(0);
                if (field == 'id') {
                    tmpAr.push({
                        field: 'id',
                        type: 'i',
                        flags: 'n',
                        rel: ''
                    });
                }
                
                // Comprobar si los tipos coinciden
                for (var i = 0; i < tmpAr.length; i++) {
                    if (tmpAr[i].field == field) {
                        if (typeof(c[k]) == "string" && tmpAr[i].type != "s") {
                            throw "invalid value type of " + c[k] + " for " + field;
                        }
                        else 
                            if (typeof(c[k]) == "boolean" && tmpAr[i].type != "b") {
                                throw "invalid value type of " + c[k] + " for " + field + " - excepted boolean";
                            }
                            else 
                                if (typeof(c[k]) == "number" && tmpAr[i].type == "s") {
                                    throw "invalid value type of " + c[k] + " for " + field;
                                }
                                else 
                                    if (typeof(c[k]) == "object" && tmpAr[i].type != "o") {
                                        // TODO: check the exact model instance
                                        throw "invalid value type of " + c[k] + " for " + field + "- excpeted object model";
                                    }
                                    else 
                                        if (tmpAr[i].type == 'd' && !(c[k] instanceof Date)) {
                                            throw "invalid value type of " + c[k] + " for " + field + "- excepted Date object";
                                        }
                        // ¿flags de comparacion?
                        if (flag != "") {
                            // Números
                            if (typeof(c[k]) == "number" && flag != "eq" && flag != "gt" && flag != "lt" && flag != "le" && flag != "ge" && flag != "ne") {
                                throw "invalid operator " + flag + " for number";
                            }
                            switch (flag) {
                                case 'gt':{
                                    partial = field + " > " + c[k];
                                    break;
                                }
                                case 'lt':{
                                    partial = field + " < " + c[k];
                                    break;
                                }
                                case 'eq':{
                                    partial = field + " = " + c[k];
                                    break;
                                }
                                case 'ne':{
                                    partial = field + " <> " + c[k];
                                    break;
                                }
                                case 'ge':{
                                    partial = field + " >= " + c[k];
                                    break;
                                }
                                case 'le':{
                                    partial = field + " <= " + c[k];
                                    break;
                                }
                                
                                
                                
                                
                            }
                            
                        }
                        else 
                            if (typeof(c[k]) == "boolean") {
                                partial = field + " = " + (c[k] ? 1 : 0);
                            }
                            else 
                                if (c[k] instanceof Date) {
                                    // TODO: estudio de flags
                                    partial = field + " = '" + c[k] + "'";
                                    
                                }
                                else 
                                    if (typeof(c[k]) == "object") {
                                        if (!c[k].hasOwnProperty('id')) {
                                            throw "not a valid object";
                                        }
                                        partial = field + " = " + c[k].id;
                                    }
                                    else {
                                        if (typeof(c[k]) == "string") {
                                            if (c[k].indexOf("%") != -1) {
                                                partial = field + " like '" + c[k] + "'";
                                            }
                                            else {
                                                partial = field + " = '" + c[k] + "'";
                                            }
                                        }
                                        else {
                                            partial = field + " = " + c[k];
                                        }
                                        
                                    }
                        break;
                    }
                    
                    
                    
                }// for sqlfields
                if (isFirst) {
                    isFirst = false;
                    where = partial;
                }
                else {
                    where += " AND " + partial;
                }
            }// for keys
            if (isFirst) {
                throw "no filter options";
            }
        }
        // Composicion de consulta
        var cons = "SELECT * FROM " + this.tablename + " WHERE " + where;
        var ref = this;
        
        this.db.execute(cons, [], function(tx, rs){
        
            var objs = [];
            for (var i = 0; i < rs.rows.length; i++) {
                var obj = new ref.constructor(ref.db);
                // Establecer propiedades
                
                // ID
                obj.id = rs.rows.item(i).id;
                
                // Resto de propiedades
                for (var j = 0; j < ref._sqlFields.length; j++) {
                    eval("obj._m_" + ref._sqlFields[j].field + " = rs.rows.item(i)[ref._sqlFields[j].field]");
                }
                objs.push(obj);
                
            }
            // Invocar al callback
            if (cb) {
                cb(objs);
            }
            
            
        }, function(tx, err){
        
        
        });
        
        
    }
    
    this.del = function(cb){
    
        if (this.id == -1) {
            throw "object no registered in database";
            
        }
        
        this.db.execute("DELETE FROM " + this.tablename + " WHERE id = ?", [this.id], function(tx, rs){
            if (cb) {
                if (rs.rowsAffected == 1) {
                    cb(true);
                }
                else {
                    cb(false);
                    
                }
            }
        }, function(tx, err){
        });
        
    }
	
	this._get_proxy = function(field,ref)
	{
		// Comprobar si ya existe
		eval("var r = this._m_"+field);
		if ( r == undefined)
		{
			return new ModelProxy(this.db,-1,ref);
		}
		else if ( typeof(r) == "number")
		{
			// Cargado, pero sin proxy
			eval("this._m_"+field+" = new ModelProxy(this.db,r,ref)");
		} else if (r == null)
		{
			// Objeto nulo
			eval("this._m_"+field+" = new ModelProxy(this.db,-1,ref)");
		}
		// Devolver el model proxy
		eval("var ret = this._m_"+field);
		return ret;
	}
}



	function ModelProxy(db, id, model){
		this.db = db;
		this.id = id;
		this.model = model;
		this.val = null;
		
		this.get = function(cb){
			if (this.val != null) {
				cb(this.val);
				return;
			}
			if (this.id != -1) {
				eval("this.val = new " + this.model + "(this.db)");
				var ref = this;
				this.val.get(this.id, function (obj){
					ref.val = obj;
					cb(obj);
				});
			}
			else{
				cb(null);
			}
			
		}
		
		this.set = function(v){
			this.val = v;
			if (v != null) {
				this.id = v.id;
			}
		}
		
		this._get = function(v){
			return this.val;
		}
	}
	

var FieldManager = require( "../../../lib/field" ).FieldManager;
var Field = require( "../../../model/field" ).Field;

exports.register = {
	setUp: function( done ) {
		this.app = {
			database: {}
		};
		this.fieldManager = new FieldManager( this.app );
		done();
	},

	"missing type": function( test ) {
		test.expect( 1 );

		test.throws(
			function() {
				this.fieldManager.register( null, {} );
			}.bind( this ),
			/^Missing required parameter `type`\.$/,
			"Should throw for missing type."
		);
		test.done();
	},

	"invalid type": function( test ) {
		test.expect( 1 );

		test.throws(
			function() {
				this.fieldManager.register( "test type", {} );
			}.bind( this ),
			/^Invalid `type` \(test type\)\.$/,
			"Should throw for invalid type."
		);
		test.done();
	},

	"registration": function( test ) {
		test.expect( 3 );

		var prototype = {
			testProp: "test value"
		};

		this.fieldManager.register( "test", prototype );
		var Constructor = this.fieldManager.types.test;
		test.ok( Constructor, "Constructor should be stored in FieldManager.types." );
		test.strictEqual( Constructor.super_, Field,
			"Constructor should inherit from Field." );
		test.equal( Constructor.prototype.testProp, "test value",
			"Prototype should pass through." );
		test.done();
	}
};

exports.create = {
	setUp: function( done ) {
		this.app = {
			database: {}
		};
		this.fieldManager = new FieldManager( this.app );
		done();
	},

	"missing type": function( test ) {
		test.expect( 1 );

		this.fieldManager.create({
			label: "my field"
		}, function( error ) {
			test.equal( error.message, "Missing required field `type`.",
				"Should throw for missing type." );
			test.done();
		});
	},

	"invalid type": function( test ) {
		test.expect( 1 );

		this.fieldManager.create({
			type: "fake",
			label: "my field"
		}, function( error ) {
			test.equal( error.message, "Invalid `type` (fake).",
				"Should throw for invalid type." );
			test.done();
		});
	},

	"missing label": function( test ) {
		test.expect( 1 );

		this.fieldManager.create({
			type: "text"
		}, function( error ) {
			test.equal( error.message, "Missing required field `label`.",
				"Should throw for missing label." );
			test.done();
		});
	},

	"invalid label": function( test ) {
		test.expect( 1 );

		var label = new Array( 65 ).join( "a" );

		this.fieldManager.create({
			type: "text",
			label: label
		}, function( error ) {
			test.equal( error.message, "Invalid `label` (" + label + ").",
				"Should throw for invalid label." );
			test.done();
		});
	},

	"database insertion error": function( test ){
		test.expect( 3 );

		this.app.database.query = function( query, values, callback ) {
			test.equal( query,
				"INSERT INTO `fields` SET " +
					"`type` = ?," +
					"`label` = ?," +
					"`config` = ?",
				"Query should insert values into database." );
			test.deepEqual( values, [ "text", "my field", "" ],
				"Should pass values for escaping." );

			process.nextTick(function() {
				callback( new Error( "database gone" ) );
			});
		};

		this.fieldManager.create({
			type: "text",
			label: "my field"
		}, function( error ) {
			test.equal( error.message, "database gone", "Should pass the error." );
			test.done();
		});
	},

	"minimal": function( test ) {
		test.expect( 4 );

		this.app.database.query = function( query, values, callback ) {
			test.equal( query,
				"INSERT INTO `fields` SET " +
					"`type` = ?," +
					"`label` = ?," +
					"`config` = ?",
				"Query should insert values into database." );
			test.deepEqual( values, [ "text", "my field", "" ],
				"Should pass values for escaping." );

			process.nextTick(function() {
				callback( null, { insertId: 37 } );
			});
		};

		this.fieldManager.create({
			type: "text",
			label: "my field"
		}, function( error, id ) {
			test.equal( error, null, "Should not pass an error." );
			test.equal( id, 37, "Should return inserted id." );
			test.done();
		});
	},

	"with config": function( test ) {
		test.expect( 4 );

		this.app.database.query = function( query, values, callback ) {
			test.equal( query,
				"INSERT INTO `fields` SET " +
					"`type` = ?," +
					"`label` = ?," +
					"`config` = ?",
				"Query should insert values into database." );
			test.deepEqual( values, [ "text", "my field", "custom config" ],
				"Should pass values for escaping." );

			process.nextTick(function() {
				callback( null, { insertId: 37 } );
			});
		};

		this.fieldManager.create({
			type: "text",
			label: "my field",
			config: "custom config"
		}, function( error, id ) {
			test.equal( error, null, "Should not pass an error." );
			test.equal( id, 37, "Should return inserted id." );
			test.done();
		});
	}
};

exports.get = {
	setUp: function( done ) {
		this.app = {
			database: {}
		};
		this.fieldManager = new FieldManager( this.app );
		done();
	},

	"database query error": function( test ) {
		test.expect( 3 );

		this.app.database.query = function( query, values, callback ) {
			test.equal( query,
				"SELECT * FROM `fields` WHERE `id` = ?",
				"Query should search by id." );
			test.deepEqual( values, [ 37 ], "Should pass values for escaping." );

			process.nextTick(function() {
				callback( new Error( "database gone" ) );
			});
		};

		this.fieldManager.get( 37, function( error ) {
			test.equal( error.message, "database gone", "Should pass the error." );
			test.done();
		});
	},

	"unknown field": function( test ) {
		test.expect( 3 );

		this.app.database.query = function( query, values, callback ) {
			test.equal( query,
				"SELECT * FROM `fields` WHERE `id` = ?",
				"Query should search by id." );
			test.deepEqual( values, [ 37 ], "Should pass values for escaping." );

			process.nextTick(function() {
				callback( null, [] );
			});
		};

		this.fieldManager.get( 37, function( error ) {
			test.equal( error.message, "Unknown field id: 37", "Should pass the error." );
			test.done();
		});
	},

	"existing field": function( test ) {
		test.expect( 4 );

		var providedSettings = {
			id: 37,
			type: "text",
			label: "my field",
			config: "custom config"
		};

		this.app.database.query = function( query, values, callback ) {
			test.equal( query,
				"SELECT * FROM `fields` WHERE `id` = ?",
				"Query should search by id." );
			test.deepEqual( values, [ 37 ], "Should pass values for escaping." );

			process.nextTick(function() {
				callback( null, [ providedSettings ]);
			});
		};

		this.fieldManager.get( 37, function( error, settings ) {
			test.equal( error, null, "Should not pass an error." );
			test.strictEqual( settings, providedSettings, "Should pass settings." );
			test.done();
		});
	}
};

exports.getInstance = {
	setUp: function( done ) {
		this.app = {};
		this.fieldManager = new FieldManager( this.app );
		done();
	},

	"get error": function( test ) {
		test.expect( 2 );

		this.fieldManager.get = function( id, callback ) {
			test.equal( id, 37, "Should pass id." );

			process.nextTick(function() {
				callback( new Error( "database gone" ) );
			});
		};

		this.fieldManager.getInstance( 37, function( error ) {
			test.equal( error.message, "database gone", "Should pass the error." );
			test.done();
		});
	},

	"invalid type": function( test ) {
		test.expect( 2 );

		this.fieldManager.get = function( id, callback ) {
			test.equal( id, 37, "Should pass id." );

			process.nextTick(function() {
				callback( null, {
					id: 37,
					type: "fake",
					label: "my field",
					config: ""
				});
			});
		};

		this.fieldManager.getInstance( 37, function( error ) {
			test.equal( error.message, "Invalid `type` (fake) for field 37.",
				"Should pass the error." );
			test.done();
		});
	},

	"init error": function( test ) {
		test.expect( 5 );

		var providedApp = this.app;
		var providedSettings = {
			id: 37,
			type: "fake",
			label: "my field",
			config: ""
		};

		this.fieldManager.get = function( id, callback ) {
			test.equal( id, 37, "Should pass id." );

			process.nextTick(function() {
				callback( null, providedSettings );
			});
		};

		this.fieldManager.types.fake = function( app, id ) {
			test.strictEqual( app, providedApp, "Should pass app to field." );
			test.equal( id, 37, "Should pass id to field." );

			this.initFromSettings = function( settings, callback ) {
				test.strictEqual( settings, providedSettings, "Should pass settings." );

				process.nextTick(function() {
					callback( new Error( "bad init" ) );
				});
			};
		};

		this.fieldManager.getInstance( 37, function( error ) {
			test.equal( error.message, "bad init", "Should pass the error." );
			test.done();
		});
	},

	"valid field": function( test ) {
		test.expect( 5 );

		var fakeInstance;
		var providedApp = this.app;
		var providedSettings = {
			id: 37,
			type: "fake",
			label: "my field",
			config: ""
		};

		this.fieldManager.get = function( id, callback ) {
			process.nextTick(function() {
				callback( null, providedSettings );
			});
		};

		this.fieldManager.types.fake = function( app, id ) {
			fakeInstance = this;

			test.strictEqual( app, providedApp, "Should pass app to field." );
			test.equal( id, 37, "Should pass id to field." );

			this.initFromSettings = function( settings, callback ) {
				test.strictEqual( settings, providedSettings, "Should pass settings." );

				process.nextTick(function() {
					callback( null );
				});
			};
		};

		this.fieldManager.getInstance( 37, function( error, instance ) {
			test.equal( error, null, "Should not pass an error." );
			test.strictEqual( instance, fakeInstance, "Should pass field instance." );
			test.done();
		});
	}
};
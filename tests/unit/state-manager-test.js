import Ember from 'ember';
import State from 'ember-states/state';
import StateManager from 'ember-states/state-manager';
import { module, test } from 'qunit';

var TestStateMixin = Ember.Mixin.create({
  entered: 0,
  enter() {
    this.entered++;
  },

  exited: 0,
  exit() {
    this.exited++;
  },

  reset() {
    this.entered = 0;
    this.exited = 0;
  }
});

var TestState = State.extend(TestStateMixin);
var TestStateManager = StateManager.extend(TestStateMixin);

var loadingState, loadedState, stateManager;

module('StateManager', {
  setup() {
    loadingState = TestState.create();
    loadedState = TestState.create({
      empty: TestState.create()
    });

    stateManager = StateManager.create({
      loadingState: loadingState,
      loadedState: loadedState
    });
  },

  teardown() {
    Ember.run(function() {
      if (stateManager) {
        stateManager.destroy();
      }
    });
  }
});

test("it exists", (assert) => {
  assert.ok(Ember.Object.detect(StateManager), "StateManager is an Ember.Object");
});

test("it discovers states set in its state property", (assert) => {
  var states = {
    loading: State.create(),
    loaded: State.create()
  };

  stateManager = StateManager.create({
    states: states
  });

  assert.equal(states, stateManager.get('states'), "reports same states as were set");
});

test("it discovers states that are properties of the state manager", (assert) => {
  stateManager = StateManager.create({
    loading: State.create(),
    loaded: State.create()
  });

  var states = stateManager.get('states');
  assert.ok(states.loading, 'found loading state');
  assert.ok(states.loaded, 'found loaded state');
});

test("it reports its current state", (assert) => {
  assert.ok(stateManager.get('currentState') === null, "currentState defaults to null if no state is specified");

  stateManager.transitionTo('loadingState');
  assert.ok(stateManager.get('currentState') === loadingState, "currentState changes after transitionTo() is called");

  stateManager.transitionTo('loadedState');
  assert.ok(stateManager.get('currentState') === loadedState, "currentState can change to a sibling state");
});

test("it reports its current state path", (assert) => {
  assert.strictEqual(stateManager.get('currentPath'), null, "currentPath defaults to null if no state is specified");

  stateManager.transitionTo('loadingState');
  assert.equal(stateManager.get('currentPath'), 'loadingState', "currentPath changes after transitionTo() is called");

  stateManager.transitionTo('loadedState');
  assert.equal(stateManager.get('currentPath'), 'loadedState', "currentPath can change to a sibling state");
});

test("it sends enter and exit events during state transitions", (assert) => {
  stateManager.transitionTo('loadingState');

  assert.equal(loadingState.entered, 1, "state should receive one enter event");
  assert.equal(loadingState.exited, 0, "state should not have received an exit event");
  assert.equal(loadedState.entered, 0, "sibling state should not have received enter event");
  assert.equal(loadedState.exited, 0, "sibling state should not have received exited event");

  loadingState.reset();
  loadedState.reset();

  stateManager.transitionTo('loadedState');
  assert.equal(loadingState.entered, 0, "state should not receive an enter event");
  assert.equal(loadingState.exited, 1, "state should receive one exit event");
  assert.equal(loadedState.entered, 1, "sibling state should receive one enter event");
  assert.equal(loadedState.exited, 0, "sibling state should not have received exited event");

  loadingState.reset();
  loadedState.reset();

  stateManager.transitionTo('loadingState');

  assert.equal(loadingState.entered, 1, "state should receive one enter event");
  assert.equal(loadingState.exited, 0, "state should not have received an exit event");
  assert.equal(loadedState.entered, 0, "sibling state should not have received enter event");
  assert.equal(loadedState.exited, 1, "sibling state should receive one exit event");
});

test("it accepts absolute paths when changing states", (assert) => {
  var emptyState = loadedState.empty;

  stateManager.transitionTo('loadingState');

  stateManager.transitionTo('loadedState.empty');

  assert.equal(emptyState.entered, 1, "sends enter event to substate");
  assert.equal(emptyState.exited, 0, "does not send exit event to substate");
  assert.ok(stateManager.get('currentState') === emptyState, "updates currentState property to state at absolute path");
});

test("it does not enter an infinite loop in transitionTo", (assert) => {
  var emptyState = loadedState.empty;

  stateManager.transitionTo('loadedState.empty');

  stateManager.transitionTo('');
  assert.ok(stateManager.get('currentState') === emptyState, "transitionTo does nothing when given empty name");

  assert.raises(() => {
    stateManager.transitionTo('nonexistentState');
  }, 'Could not find state for path: "nonexistentState"');

  assert.ok(stateManager.get('currentState') === emptyState, "transitionTo does not infinite loop when given nonexistent State");
});

test("it automatically transitions to a default state", (assert) => {
  stateManager = StateManager.create({
    start: State.create({
      isStart: true
    })
  });

  assert.ok(stateManager.get('currentState').isStart, "automatically transitions to start state");
});

test("it automatically transitions to a default state that is an instance", (assert) => {
  stateManager = StateManager.create({
    states: {
      foo: State.create({
        start: State.extend({
          isStart: true
        })
      })
    }
  });

  stateManager.transitionTo('foo');
  assert.ok(stateManager.get('currentState').isStart, "automatically transitions to start state");
});

test("on a state manager, it automatically transitions to a default state that is an instance", (assert) => {
  stateManager = StateManager.create({
    states: {
      start: State.extend({
        isStart: true
      })
    }
  });

  assert.ok(stateManager.get('currentState').isStart, "automatically transitions to start state");
});

test("it automatically transitions to a default state specified using the initialState property", (assert) => {
  stateManager = StateManager.create({
    initialState: 'beginning',

    beginning: State.create({
      isStart: true
    })
  });

  assert.ok(stateManager.get('currentState').isStart, "automatically transitions to beginning state");
});

test("it automatically transitions to a default substate specified using the initialState property", (assert) => {
  stateManager = StateManager.create({
    start: State.create({
      initialState: 'beginningSubstate',

      beginningSubstate: State.create({
        isStart: true
      })
    })
  });

  assert.ok(stateManager.get('currentState').isStart, "automatically transitions to beginning substate");
});

test("it automatically synchronously transitions into initialState in an event", (assert) => {
  var count = 0;

  stateManager = StateManager.create({
    root: State.create({
      original: State.create({
        zomgAnEvent(manager) {
          manager.transitionTo('nextState');
          manager.send('zomgAnotherEvent');
        }
      }),

      nextState: State.create({
        initialState: 'begin',

        begin: State.create({
          zomgAnotherEvent() {
            count++;
          }
        })
      })
    })
  });

  Ember.run(function() {
    stateManager.transitionTo('root.original');
  });

  Ember.run(function() {
    stateManager.send('zomgAnEvent');
    assert.equal(count, 1, "the initialState was synchronously effective");
  });
});

test("it automatically transitions to multiple substates specified using either start or initialState property", (assert) => {
  stateManager = StateManager.create({
    start: State.create({
      initialState: 'beginningSubstate',

      beginningSubstate: State.create({
        start: State.create({
          initialState: 'finalSubstate',

          finalSubstate: State.create({
            isStart: true
          })
        })
      })
    })
  });

  assert.ok(stateManager.get('currentState').isStart, "automatically transitions to final substate");
});

test("it triggers setup on initialSubstate", (assert) => {
  var parentSetup = false,
      childSetup = false,
      grandchildSetup = false;

  stateManager = StateManager.create({
    start: State.create({
      setup() { parentSetup = true; },

      initialState: 'childState',

      childState: State.create({
        setup() { childSetup = true; },

        initialState: 'grandchildState',

        grandchildState: State.create({
          setup() { grandchildSetup = true; }
        })
      })
    })
  });

  assert.ok(parentSetup, "sets up parent");
  assert.ok(childSetup, "sets up child");
  assert.ok(grandchildSetup, "sets up grandchild");
});

test("it throws an assertion error when the initialState does not exist", (assert) => {
  assert.raises(function() {
    StateManager.create({
      initialState: 'foo',
      bar: State.create()
    });
  });
});

module("StateManager - Transitions on Complex State Managers");

/**
            SM
          /    \
     Login      Redeem
    /    |        |    \
  Start  Pending Start  Pending

  * Transition from Login.Start to Redeem
    - Login.Start and Login should receive exit events
    - Redeem should receiver enter event
*/

test("it sends exit events to nested states when changing to a top-level state", (assert) => {
  var stateManager = StateManager.create({
    login: TestState.create({
      start: TestState.create(),
      pending: TestState.create()
    }),

    redeem: TestState.create({
      isRedeem: true,
      start: State.create(),
      pending: State.create()
    })
  });

  stateManager.transitionTo('login');
  assert.equal(stateManager.login.entered, 1, "precond - it enters the login state");
  assert.equal(stateManager.login.start.entered, 1, "automatically enters the start state");
  assert.ok(stateManager.get('currentState') === stateManager.login.start, "automatically sets currentState to start state");

  stateManager.login.reset();
  stateManager.login.start.reset();

  stateManager.transitionTo('redeem');

  assert.equal(stateManager.login.exited, 1, "login state is exited once");
  assert.equal(stateManager.login.start.exited, 1, "start state is exited once");

  assert.equal(stateManager.redeem.entered, 1, "redeemed state is entered once");
});

test("it sends exit events in the correct order when changing to a top-level state", (assert) => {
  var exitOrder = [],
      stateManager = StateManager.create({
        start: State.create({
          outer: State.create({
            inner: State.create({
              exit() { exitOrder.push('exitedInner'); }
            }),
            exit() { exitOrder.push('exitedOuter'); }
          })
        })
      });

  stateManager.transitionTo('start.outer.inner');
  stateManager.transitionTo('start');
  assert.equal(exitOrder.length, 2, "precond - it calls both exits");
  assert.equal(exitOrder[0], 'exitedInner', "inner exit is called first");
  assert.equal(exitOrder[1], 'exitedOuter', "outer exit is called second");
});

test("it sends exit events in the correct order when changing to a state multiple times", (assert) => {
  var exitOrder = [],
      stateManager = StateManager.create({
        start: State.create({
          outer: State.create({
            inner: State.create({
              exit() { exitOrder.push('exitedInner'); }
            }),
            exit() { exitOrder.push('exitedOuter'); }
          })
        })
      });

  stateManager.transitionTo('start.outer.inner');
  stateManager.transitionTo('start');
  stateManager.transitionTo('start.outer.inner');
  exitOrder = [];
  stateManager.transitionTo('start');
  assert.equal(exitOrder.length, 2, "precond - it calls both exits");
  assert.equal(exitOrder[0], 'exitedInner', "inner exit is called first");
  assert.equal(exitOrder[1], 'exitedOuter', "outer exit is called second");
});

var passedContext, passedContexts, loadingEventCalled, loadedEventCalled, eventInChildCalled;
loadingEventCalled = loadedEventCalled = eventInChildCalled = 0;

module("StateManager - Event Dispatching", {
  setup() {
    stateManager = StateManager.create({
      loading: State.create({
        anEvent(manager, context) {
          loadingEventCalled++;
          passedContext = context;
          passedContexts = [].slice.call(arguments, 1);
        }
      }),

      loaded: State.create({
        anEvent() {
          loadedEventCalled++;
        },

        eventInChild() {
          eventInChildCalled++;
        },

        empty: State.create({
          eventInChild() {
            eventInChildCalled++;
          }
        })
      })
    });

    stateManager.transitionTo('loading');
  }
});

test("it dispatches events to the current state", (assert) => {
  stateManager.send('anEvent');

  assert.equal(loadingEventCalled, 1, "event was triggered");
});

test("it dispatches events to a parent state if the child state does not respond to it", (assert) => {
  stateManager.transitionTo('loaded.empty');
  stateManager.send('anEvent');

  assert.equal(loadedEventCalled, 1, "parent state receives event");
});

test("it does not dispatch events to parents if the child responds to it", (assert) => {
  stateManager.transitionTo('loaded.empty');
  stateManager.send('eventInChild');

  assert.equal(eventInChildCalled, 1, "does not dispatch event to parent");
});

test("it supports arguments to events", (assert) => {
  stateManager.send('anEvent', { context: true });
  assert.equal(passedContext.context, true, "send passes along a context");
});

test("it supports multiple arguments to events", (assert) => {
  stateManager.send('anEvent', {name: 'bestie'}, {name: 'crofty'});
  assert.equal(passedContexts[0].name, 'bestie', "send passes along the first context");
  assert.equal(passedContexts[1].name, 'crofty', "send passes along the second context");
});

test("it throws an exception if an event is dispatched that is unhandled", (assert) => {
  assert.raises(function() {
    stateManager.send('unhandledEvent');
  }, Error, "exception was raised");

  stateManager = StateManager.create({
    initialState: 'loading',
    errorOnUnhandledEvent: false,
    loading: State.create({
      anEvent() {}
    })
  });

  stateManager.send('unhandledEvent');
  assert.ok(true, "does not raise exception when errorOnUnhandledEvent is set to false");
});

test("it looks for unhandledEvent handler in the currentState if event is not handled by named handler", (assert) => {
  var wasCalled = 0,
      evt = "foo",
      calledWithOriginalEventName,
      calledWithEvent;
  stateManager = StateManager.create({
    initialState: 'loading',
    loading: State.create({
      unhandledEvent(manager, originalEventName, event) {
        wasCalled = true;
        calledWithOriginalEventName = originalEventName;
        calledWithEvent = event;
      }
    })
  });
  stateManager.send("somethingUnhandled", evt);
  assert.ok(wasCalled);
  assert.equal(calledWithOriginalEventName, 'somethingUnhandled');
  assert.equal(calledWithEvent, evt);
});

test("it looks for unhandledEvent handler in the stateManager if event is not handled by named handler", (assert) => {
  var wasCalled = 0,
      evt = "foo",
      calledWithOriginalEventName,
      calledWithEvent;
  stateManager = StateManager.create({
    initialState: 'loading',
    unhandledEvent(manager, originalEventName, event) {
      wasCalled = true;
      calledWithOriginalEventName = originalEventName;
      calledWithEvent = event;
    },
    loading: State.create({})
  });
  stateManager.send("somethingUnhandled", evt);
  assert.ok(wasCalled);
  assert.equal(calledWithOriginalEventName, 'somethingUnhandled');
  assert.equal(calledWithEvent, evt);
});

module("Statemanager - Pivot states", {
  setup() {
    stateManager = TestStateManager.create({
      grandparent: TestState.create({
        parent: TestState.create({
          child: TestState.create(),
          sibling: TestState.create()
        }),
        cousin: TestState.create()
      })
    });
  }
});

test("transitionTo triggers all enter states", (assert) => {
  stateManager.transitionTo('grandparent.parent.child');
  assert.equal(stateManager.grandparent.entered, 1, "the top level should be entered");
  assert.equal(stateManager.grandparent.parent.entered, 1, "intermediate states should be entered");
  assert.equal(stateManager.grandparent.parent.child.entered, 1, "the final state should be entered");

  stateManager.transitionTo('grandparent.parent.sibling');
  assert.equal(stateManager.grandparent.entered, 1, "the top level should not be re-entered");
  assert.equal(stateManager.grandparent.parent.entered, 1, "intermediate states should not be re-entered");
  assert.equal(stateManager.grandparent.parent.child.entered, 1, "the final state should not be re-entered");

  assert.equal(stateManager.grandparent.parent.child.exited, 1, "the child should have exited");
  assert.equal(stateManager.grandparent.exited, 0, "the top level should not have have exited");
  assert.equal(stateManager.grandparent.parent.exited, 0, "intermediate states should not have exited");
});

test("transitionTo with current state does not trigger enter or exit", (assert) => {
  stateManager.transitionTo('grandparent.parent.child');
  stateManager.transitionTo('grandparent.parent.child');
  assert.equal(stateManager.grandparent.entered, 1, "the top level should only be entered once");
  assert.equal(stateManager.grandparent.parent.entered, 1, "intermediate states should only be entered once");
  assert.equal(stateManager.grandparent.parent.child.entered, 1, "the final state should only be entered once");
  assert.equal(stateManager.grandparent.parent.child.exited, 0, "the final state should not be exited");
});

module("Transition event");

test("setup is triggered", (assert) => {
  assert.expect(1);

  Ember.run(function() {
    stateManager = StateManager.create({
      start: State.create({
        goNext(manager) {
          manager.transitionTo('next');
        },

        next: State.create({
          setup() {
            assert.ok("setup is called");
          }
        })
      })
    });
  });

  stateManager.send('goNext');
});

test("transitionEvent is called for each nested state", (assert) => {
  assert.expect(4);

  var calledOnParent = false,
      calledOnChild = true;

  Ember.run(() => {
    stateManager = StateManager.create({
      start: State.create(),

      planters: State.create({
        setup() {
          calledOnParent = true;
        },

        nuts: State.create({
          setup() {
            calledOnChild = true;
          }
        })
      })
    });
  });

  stateManager.transitionTo('planters.nuts');

  assert.ok(calledOnParent, 'called transitionEvent on parent');
  assert.ok(calledOnChild, 'called transitionEvent on child');

  // repeat the test now that the path is cached

  stateManager.transitionTo('start');

  calledOnParent = false;
  calledOnChild = false;

  stateManager.transitionTo('planters.nuts');

  assert.ok(calledOnParent, 'called transitionEvent on parent');
  assert.ok(calledOnChild, 'called transitionEvent on child');
});

test("nothing happens if transitioning to a parent state when the current state is also the initial state", (assert) => {
  var calledOnParent = 0,
      calledOnChild = 0;

  Ember.run(function() {
    stateManager = StateManager.create({
      start: State.create({
        initialState: 'first',

        setup() {
          calledOnParent++;
        },

        first: State.create({
          setup() {
            calledOnChild++;
          }
        })
      })
    });
  });

  assert.equal(calledOnParent, 1, 'precond - setup parent');
  assert.equal(calledOnChild, 1, 'precond - setup child');
  assert.equal(stateManager.get('currentState.path'), 'start.first', 'precond - is in expected state');

  stateManager.transitionTo('start');

  assert.equal(calledOnParent, 1, 'does not transition to parent again');
  assert.equal(calledOnChild, 1, 'does not transition to child again');
  assert.equal(stateManager.get('currentState.path'), 'start.first', 'does not change state');

});

test("StateManagers can use `create`d states from mixins", (assert) => {
  var statesMixin,
    firstManagerClass, secondManagerClass,
    firstManager, secondManager,
    firstCount = 0, secondCount = 0;

  statesMixin = Ember.Mixin.create({
    initialState: 'ready',
    ready: State.create({
      startUpload(manager) {
        manager.transitionTo('uploading');
      }
    })
  });

  firstManagerClass = StateManager.extend(statesMixin, {
    uploading: State.create({
      enter() { firstCount++; }
    })
  });

  secondManagerClass = StateManager.extend(statesMixin, {
    uploading: State.create({
      enter() { secondCount++; }
    })
  });

  firstManager  = firstManagerClass.create();
  firstManager.send('startUpload');

  secondManager = secondManagerClass.create();
  secondManager.send('startUpload');

  assert.equal(firstCount, 1, "The first state manager's uploading state was entered once");
  assert.equal(secondCount, 1, "The second state manager's uploading state was entered once");
});


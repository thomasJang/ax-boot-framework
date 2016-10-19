var fnObj = {};
var ACTIONS = axboot.actionExtend(fnObj, {
    PAGE_SEARCH: function (caller, act, data) {

        if (data && data.page) {
            caller.searchView.setPageNumber(data.page.pageNumber);
        }

        axboot.ajax({
            type: "GET",
            url: "/api/v1/errorLogs",
            data: caller.searchView.getData(),
            callback: function (res) {
                caller.gridView01.setData(res);
            }
        });
        return false;
    },
    PAGE_SAVE: function (caller, act, data) {
        var saveList = [].concat(caller.gridView01.getData("modified"));
        saveList = saveList.concat(caller.gridView01.getData("deleted"));

        axboot.ajax({
            type: "PUT",
            url: "/api/v1/programs",
            data: JSON.stringify(saveList),
            callback: function (res) {
                ACTIONS.dispatch(ACTIONS.PAGE_SEARCH);
                axToast.push("저장 되었습니다");
            }
        });
    },
    ITEM_CLICK: function (caller, act, data) {
        caller.formView01.setData(data);
    },
    ITEM_REMOVE: function (caller, act, data) {
        var delete_queue = caller.gridView01.getData("selected");
        if (delete_queue.length == 0) {
            alert("삭제할 목록을 선택해주세요");
            return;
        }
        if (!confirm("정말 삭제하시겠습니까?")) return;

        var delQueue = function () {
            var pars;
            if (pars = delete_queue.shift()) {
                axboot.ajax({
                    type: "DELETE",
                    url: "/api/v1/errorLogs/" + pars.id,
                    data: "",
                    callback: function (res) {
                        delQueue();
                    },
                    options: {
                        onError: function (err) {
                            alert("삭제작업에 실패하였습니다.");
                            ACTIONS.dispatch(ACTIONS.PAGE_SEARCH);
                        }
                    }
                });
            } else {
                axToast.push("삭제 처리 되었습니다.");
                ACTIONS.dispatch(ACTIONS.PAGE_SEARCH);
            }
        };

        delQueue();
    },
    ITEM_REMOVEALL: function (caller, act, data) {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        axboot.ajax({
            type: "DELETE",
            url: "/api/v1/errorLogs/events/all",
            data: "",
            callback: function (res) {
                axToast.push("삭제 처리 되었습니다.");
                ACTIONS.dispatch(ACTIONS.PAGE_SEARCH);
            }
        });
    },
    dispatch: function (caller, act, data) {
        var result = ACTIONS.exec(caller, act, data);
        if (result != "error") {
            return result;
        } else {
            // 직접코딩
            return false;
        }
    }
});

// fnObj 기본 함수 스타트와 리사이즈
fnObj.pageStart = function () {
    this.pageButtonView.initView();
    this.searchView.initView();
    this.gridView01.initView();
    this.formView01.initView();

    ACTIONS.dispatch(ACTIONS.PAGE_SEARCH);
};

fnObj.pageResize = function () {

};


fnObj.pageButtonView = axboot.viewExtend({
    initView: function () {
        axboot.buttonClick(this, "data-page-btn", {
            "search": function () {
                ACTIONS.dispatch(ACTIONS.PAGE_SEARCH);
            },
            "save": function () {
                ACTIONS.dispatch(ACTIONS.PAGE_SAVE);
            }
        });
    }
});

//== view 시작
/**
 * searchView
 */
fnObj.searchView = axboot.viewExtend(axboot.searchView, {
    initView: function () {
        this.target = $(document["searchView0"]);
        this.target.attr("onsubmit", "return ACTIONS.dispatch(ACTIONS.PAGE_SEARCH);");
        this.filter = $("#filter");
    },
    getData: function () {
        return {
            pageNumber: this.pageNumber,
            pageSize: this.pageSize,
            filter: this.filter.val(),
            sort: "id,desc"
        }
    }
});


/**
 * gridView
 */
fnObj.gridView01 = axboot.viewExtend(axboot.gridView, {
    initView: function () {
        var _this = this;
        this.target = axboot.gridBuilder({
            showRowSelector: true,
            frozenColumnIndex: 0,
            multipleSelect: true,
            target: $('[data-ax5grid="grid-view-01"]'),
            columns: [
                {key: "id", label: "ID", width: 60, align: "center"},
                {key: "phase", label: "빌드단계", width: 80, align: "center"},
                {key: "system", label: "시스템명", width: 70, align: "center"},
                {key: "serverName", label: "서버명", width: 100, align: "center"},
                {key: "hostName", label: "호스트명", width: 100, align: "center"},
                {key: "path", label: "URL", width: 100, align: "center"},
                {key: "message", label: "에러 메시지", width: 400, align: "left"},
                {
                    key: "errorDatetime", label: "발생시간", width: 140, align: "center", formatter: function () {
                    return ax5.util.date(new Date(this.value || ""), {"return": 'yyyy/MM/dd hh:mm:ss'});
                }
                }
            ],
            body: {
                onClick: function () {
                    this.self.select(this.dindex);
                    ACTIONS.dispatch(ACTIONS.ITEM_CLICK, this.list[this.dindex]);
                }
            },
            onPageChange: function (pageNumber) {
                ACTIONS.dispatch(ACTIONS.PAGE_SEARCH, {page: {pageNumber: pageNumber}});
            }
        });

        axboot.buttonClick(this, "data-grid-view-01-btn", {
            "remove": function () {
                ACTIONS.dispatch(ACTIONS.ITEM_REMOVE);
            },
            "removeAll": function () {
                ACTIONS.dispatch(ACTIONS.ITEM_REMOVEALL);
            }
        });
    },
    getData: function (_type) {
        var list = [];
        var _list = this.target.getList();
        if (_type == "selected") {
            list = ax5.util.filter(_list, function () {
                return this.__selected__;
            });
        } else {
            list = _list;
        }
        return list;
    },
    addRow: function () {
        this.target.addRow({__created__: true, useYn: "N"}, "last");
    }
});


/**
 * formView01
 */
fnObj.formView01 = axboot.viewExtend(axboot.formView, {
    getDefaultData: function () {
        return {
            trace: "에러목록을 선택하세요."
        };
    },
    initView: function () {
        this.target = $("#formView01");
        this.model = new ax5.ui.binder();
        this.model.setModel(this.getDefaultData(), this.target);
        this.modelFormatter = new axboot.modelFormatter(this.model); // 모델 포메터 시작
        this.initEvent();
        this.prettify();
    },
    initEvent: function () {

    },
    getData: function () {
        var data = this.modelFormatter.getClearData(this.model.get()); // 모델의 값을 포멧팅 전 값으로 치환.
        return $.extend({}, data);
    },
    setData: function (data) {
        if (typeof data === "undefined") data = this.getDefaultData();
        data = $.extend({}, data);

        this.model.setModel(data);
        this.modelFormatter.formatting(); // 입력된 값을 포메팅 된 값으로 변경
        this.prettify();
    },
    validate: function () {
        var rs = this.model.validate();
        if (rs.error) {
            alert(rs.error[0].jquery.attr("title") + '을(를) 입력해주세요.');
            rs.error[0].jquery.focus();
            return false;
        }
        return true;
    },
    clear: function () {
        this.model.setModel(this.getDefaultData());
    },
    prettify: function () {
        this.target.find(".for-prettify").each(function () {
            var $this = $(this);
            var path = $this.attr("data-ax-path");

            var po = [];

            if (path == "parameterMap" || path == "headerMap" || path == "userInfo") {
                po.push('<pre class="prettyprint linenums lang-js" style="margin:0;">');
                try {
                    po.push(JSON.stringify(JSON.parse($this.text()), null, '    '));
                } catch (e) {

                }
            } else {
                po.push('<pre class="prettyprint linenums" style="margin:0;">');
                po.push($this.html());
            }
            po.push('</pre>');
            $this.html(po.join(''));
        });
        if (window["prettyPrint"]) window["prettyPrint"]();
    }
});

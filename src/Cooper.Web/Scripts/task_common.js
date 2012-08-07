﻿//Copyright (c) CodeSharp.  All rights reserved. - http://www.icodesharp.com/

///<reference path="task.js" />
///<reference path="task_bind.js" />
///<reference path="task_bind_shortcuts.js" />
///<reference path="task_row.js" />

//任务列表UI模式 通用
var UI_List_Common = function () { }
UI_List_Common.prototype = {
    //标识列表模式
    mode: 'common',
    $wrapper: null, //列表容器
    $wrapper_detail: null, //详情容器
    $focusRow: null, //记录焦点行元素
    $batchDetail: null, //批量详情
    $cancel_delete: null, //撤销删除区域元素
    deletes: null, //上一次任务删除记录
    deletes_timer: null, //删除恢复期间的定时器
    deletes_timer2: null, //删除恢复期间的定时器
    //常用任务属性
    today: '0',
    upcoming: '1',
    later: '2',
    ////////////////////////////////////////////////////////////////////////////////////////
    //关键样式名：row_task,row_active,todolist
    //屏蔽常用部分的UI影响
    getRow: function ($e) { return $e.parents('tr').eq(0); },
    getTaskId: function ($r) { return $r.attr('id'); },
    getRegionOfRow: function ($r) { return $r.parents('table.todolist').eq(0); },
    getTasks: function ($e) { if ($e) return $e.find('tr.row_task'); else return this.$wrapper.find('tr.row_task'); },
    getTaskVal: function ($r) { return $r.find('input').val(); },
    isTask: function ($r) { return $r.hasClass('row_task'); },
    getActives: function () { return this.$wrapper.find('tr.row_active'); },
    isActive: function ($r) { return $r.hasClass('row_active'); },
    setActive: function ($r) { return $r.addClass('row_active'); },
    removeActive: function ($r) { return $r.removeClass('row_active'); },
    focusRow: function ($r) { this._expandRowRegion($r); return $r.find('input').focus(); },
    setHidenInMode: function ($e) { return $e.addClass('disabled_in_this_mode').hide(); },
    removeHidenInMode: function () { return this.$wrapper.find('.disabled_in_this_mode').removeClass('disabled_in_this_mode').show(); },
    //缓存引用部分
    eachTask: function (fn) {
        for (var id in cached_tasks)
            if (cached_tasks[id])
                fn(cached_tasks[id]);
    },
    getTask: function ($r) { return cached_tasks[this.getTaskId($r)]; },
    setTask: function (i, t) { cached_tasks[i] = t; },
    getTaskById: function (i) { return cached_tasks[i]; },
    getSort: function (k) { return cached_sorts[k]; },
    //修正批量详情中的临时id
    repairBatchDetailId: function (old, id) {
        if (!this.$batchDetail) return;
        var prev = this.$batchDetail.attr('id').split(',');
        debuger.debug('old batch ids', prev);
        var arr = $.merge($.grep(prev, function (n) { return n != old }), [id]);
        debuger.debug('new batch ids', arr);
        this.$batchDetail.attr('id', arr.join(','));
    },
    ////////////////////////////////////////////////////////////////////////////////////////
    //主体渲染
    _renderByIdx: function (k) {
        this.getSort(k).render();
        this.$wrapper.append(this.getSort(k).el());
    },
    //详情区域渲染
    _renderDetail: function ($r) {
        var t = this.getTask($r);
        this.$wrapper_detail.empty().append(t.renderDetail());
        //额外修正一些由于未append导致的显示问题
        t.fixDetail();
    },
    _renderBatchDetail: function ($rows) {
        if (!this.$batchDetail)
            this.$batchDetail = $(tmp_detail_batch);
        var base = this;
        var ids = [$rows.length];
        var isCompleted, priority;
        $rows.each(function (i, n) {
            var id = base.getTaskId($(n));
            ids[i] = id;
            var task = base.getTaskById(id);
            if (i == 0) {
                isCompleted = task.isCompleted();
                priority = task.priority();
                return;
            }
            if (isCompleted != task.isCompleted()) { isCompleted = null }
            if (priority != task.priority()) { priority = null }
        });
        //批量id设置
        this.$batchDetail.attr('id', ids.join(','));
        //批量标题
        this.$batchDetail.find('#subject').html($rows.length + lang.batch_task);
        //批量是否完成
        if (isCompleted != null)
            this.$batchDetail.find('#isCompleted')
            [isCompleted ? 'addClass' : 'removeClass']('active')
            [isCompleted ? 'addClass' : 'removeClass']('btn-success');
        else
            this.$batchDetail.find('#isCompleted').removeClass('active').removeClass('btn-success');
        //批量优先级
        if (priority != null)
            this.$batchDetail.find('#priority button')
                .removeClass('active')
                .eq(parseInt(priority))
                .addClass('active');
        else
            this.$batchDetail.find('#priority button').removeClass('active');
        this.$wrapper_detail.empty().append(this.$batchDetail);
        //datepicker重复初始化问题 应先append再初始化
        if (this.modeArgs.editable)
            this.$batchDetail.find('#dueTime').removeClass('hasDatepicker').datepicker();
    },
    _isBatchDetailValid: function () { return this.$batchDetail && this.$batchDetail.css('display') == 'block'; },
    ////////////////////////////////////////////////////////////////////////////////////////
    //批量对wrapper中的当前region执行flush操作
    _flushIdxs: function () {
        debuger.profile('ui_flushIdxs');
        var base = this;
        this.$wrapper.find('.todolist:visible').each(function () {
            if (cached_sorts[$(this).attr('key')] != undefined)
                cached_sorts[$(this).attr('key')].flush($(this).attr('by'));
        });
        //允许额外的实现
        if (this.onFlushIdxs)
            this.onFlushIdxs();
        debuger.profileEnd('ui_flushIdxs');
    },
    ////////////////////////////////////////////////////////////////////////////////////////
    //wrapper主体事件绑定，处理全局事件
    _prepareBinds: function () {
        //取消所有已有bind
        this.$wrapper.unbind();
        this.$wrapper.find('tr.row_task').unbind();
        this.$wrapper.find('input').unbind();
        this.$wrapper_detail.unbind();
        //基本绑定
        this._bind();
        //键盘快捷键绑定
        this._bindShortcuts();
        //允许额外的实现
        if (this.onPrepareBinds)
            this.onPrepareBinds();
    },
    _expandRegion: function ($r) { $r.show(); },
    _expandRowRegion: function ($row) {
        $row.parents('tbody').eq(0).show();
    },
    _setEditable: function ($el) {
        $el.find('input').attr('readonly', !this.modeArgs.editable);
        $el.find('textarea').attr('readonly', !this.modeArgs.editable);
    },
    _appendTaskToRow: function ($row, t, a) {
        var active = a == undefined ? this.getTask($row) : a;
        var $input = $row.find('input');
        t.el()[$input[0].selectionStart == 0 && $input.val() != '' ? 'insertBefore' : 'insertAfter']($row);
        if ($input[0].selectionStart > 0) {
            //若出现截断则拆分任务
            var prevVal = $input.val().substring(0, $input[0].selectionStart);
            var nextVal = $input.val().substring($input[0].selectionStart);
            debuger.debug('prevVal=' + prevVal);
            debuger.debug('nextVal=' + nextVal);
            active.setSubject(prevVal, true);
            t.setSubject(nextVal, true);
        }
    },
    ////////////////////////////////////////////////////////////////////////////////////////
    //行为和主要差异部分 不做实现
    //判断区域合法性
    _isValidRegion: function ($r) { return true; },
    _isRowOfValidRegion: function ($r) { return true; },
    //完整渲染
    render: function () { },
    //新建
    appendTask: function () { },
    //归档
    archiveTasks: function () { },
    ////////////////////////////////////////////////////////////////////////////////////////
    //行为和主要差异部分 部分实现
    //删除
    deleteTask: function (b) {
        var $actives = this.getActives();
        var l = $actives.length;
        if (l == 0)
            return;
        var base = this;

        //先清空上一次的删除缓冲
        this.continueDelete();
        this.deletes = [];
        //批量删除
        $actives.each(function () {
            var active = base.getTask($(this));
            var id = active.id();
            base.setTask(id, null);
            //追加删除变更
            base.deletes = $.merge(base.deletes, [{ 'Type': 1, 'ID': id}]);
            active.el().remove();
        });

        if (b) {
            this.continueDelete();
            return;
        }
        //给予一定时间的撤销机会 
        //注意：由于定时原因，会导致重新加载操作时删除记录未被提交
        var i = 10;
        this.$cancel_delete.show().find('span').eq(0).html(l);
        this.deletes_timer = setTimeout(function () { base.continueDelete(); }, i * 1000);
        //优化体验 给出倒计时
        clearInterval(this.deletes_timer2);
        var $temp = this.$cancel_delete.show().find('span').eq(1).html(i);
        this.deletes_timer2 = setInterval(function () { if (i-- > 0) $temp.html(i) }, 1000);

        this._flushIdxs();
        this.$wrapper_detail.empty();
    },
    cancelDelete: function () {
        debuger.info('cancel deletes', this.deletes);
        clearTimeout(this.deletes_timer);
        this.deletes_timer = null;
        this.deletes = null;
        this.$cancel_delete.hide();
    },
    continueDelete: function () {
        debuger.info('continue deletes', this.deletes);
        clearTimeout(this.deletes_timer);
        //填充进全局删除记录
        if (this.deletes)
            changes_delete = $.merge(changes_delete, this.deletes);
        this.deletes_timer = null;
        this.deletes = null;
        this.$cancel_delete.hide();
    },
    toggleTasks: function () {
        var display = this.$wrapper.find('tbody').first().css('display');
        this.$wrapper.find('tbody')[display == 'none' ? 'show' : 'hide']();
    },
    setEditable: function (b) {
        debuger.debug('setEditable=' + b);
        this.modeArgs.editable = b;
        this._prepareBinds();
        this._setEditable(this.$wrapper);
    }
}